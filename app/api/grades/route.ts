import { NextRequest, NextResponse } from "next/server";
import type { GradebookData, CourseGrade, Assignment, GradingCategory } from "@/lib/studentvue/types";

// Synergy StudentVUE XML API — used by districts across the US
async function fetchStudentVueGradebook(
  districtUrl: string,
  username: string,
  password: string
): Promise<GradebookData> {
  const base = districtUrl.replace(/\/$/, "");
  const endpoint = `${base}/Service/PXPCommunication.asmx/ProcessWebServiceRequest`;

  const xmlParam = `<Parms><Param id="childIntID">0</Param></Parms>`;

  const body = new URLSearchParams({
    userID: username,
    password: password,
    skipLoginLog: "true",
    parent: "false",
    webServiceHandleName: "PXPWebServices",
    methodName: "Gradebook",
    paramStr: xmlParam,
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`StudentVUE returned HTTP ${res.status}`);
  }

  const xml = await res.text();

  // Check for login error
  if (xml.includes("Invalid user id or password") || xml.includes("Login Failed")) {
    throw new Error("Invalid username or password");
  }

  return parseGradebook(xml);
}

// Minimal XML parser — pulls out attributes without a heavy dependency
function getAttr(xml: string, attr: string): string {
  const match = xml.match(new RegExp(`${attr}="([^"]*)"`));
  return match ? match[1] : "";
}

function getAllMatches(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*/?>([\\s\\S]*?)</${tag}>|<${tag}[^/]*/?>`, "g");
  const selfClose = new RegExp(`<${tag}([^/]*)/>`, "g");
  const results: string[] = [];
  let m;

  // Self-closing tags
  while ((m = selfClose.exec(xml)) !== null) {
    results.push(m[0]);
  }

  // Also try block tags
  const blockRe = new RegExp(`<${tag}([\\s\\S]*?)>([\\s\\S]*?)<\\/${tag}>`, "g");
  while ((m = blockRe.exec(xml)) !== null) {
    results.push(m[0]);
  }

  return results;
}

function parseGradebook(xml: string): GradebookData {
  // Extract reporting period
  const reportingPeriod = getAttr(xml, "ReportPeriod") || "Current Period";

  // Split into Course blocks
  const courseBlocks = xml.split(/<Course /i).slice(1);

  const courses: CourseGrade[] = courseBlocks.map((block, idx) => {
    const name = getAttr(block, "Title") || getAttr(block, "CourseTitle") || "Course";
    const teacher = getAttr(block, "Staff") || getAttr(block, "Teacher") || "";
    const period = parseInt(getAttr(block, "Period") || "0");
    const room = getAttr(block, "Room") || "";
    const id = getAttr(block, "ID") || String(idx);

    // Find the Mark block
    const markMatch = block.match(/<Mark[\s\S]*?>/);
    const markBlock = markMatch ? markMatch[0] : "";

    const rawScore = getAttr(markBlock, "CalculatedScoreRaw") || getAttr(markBlock, "ScoreRaw");
    const letter = getAttr(markBlock, "CalculatedScoreString") || getAttr(markBlock, "ScoreString") || "N/A";
    const grade = rawScore !== "" ? parseFloat(rawScore) : null;

    // Categories
    const catMatches = block.match(/<AssignmentGradeCalc[^>]*\/>/g) || [];
    const categories: GradingCategory[] = catMatches.map((c) => ({
      name: getAttr(c, "Type") || "Category",
      weight: parseFloat(getAttr(c, "Weight") || "0"),
      score: parseFloat(getAttr(c, "Points") || "0"),
      maxScore: parseFloat(getAttr(c, "PointsPossible") || "0"),
    }));

    // Assignments
    const asnMatches = block.match(/<Assignment[^>]*\/>/g) || [];
    const assignments: Assignment[] = asnMatches.map((a, i) => {
      const scoreStr = getAttr(a, "Score");
      const pointsStr = getAttr(a, "Points");
      const maxScore = parseFloat(pointsStr) || 100;
      const score = scoreStr === "" || scoreStr === "Not Graded" ? null : parseFloat(scoreStr);
      return {
        id: getAttr(a, "GradebookID") || String(i),
        name: getAttr(a, "Measure") || "Assignment",
        category: getAttr(a, "Type") || "Assignment",
        score,
        maxScore,
        percentage: score !== null && maxScore > 0 ? (score / maxScore) * 100 : null,
        isDropped: getAttr(a, "DropScoreFlag") === "1",
        dueDate: getAttr(a, "DueDate") || "",
        notes: getAttr(a, "Notes") || "",
      };
    });

    return { id, name, teacher, period, room, grade, letter, categories, assignments };
  });

  return { reportingPeriod, courses };
}

export async function POST(request: NextRequest) {
  const { username, password, districtUrl } = await request.json();
  if (!username || !password || !districtUrl) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const gradebook = await fetchStudentVueGradebook(districtUrl, username, password);
    return NextResponse.json(gradebook);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch grades";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
