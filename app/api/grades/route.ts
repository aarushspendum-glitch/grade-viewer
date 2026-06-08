import { NextRequest, NextResponse } from "next/server";
import type { GradebookData, CourseGrade, Assignment, GradingCategory } from "@/lib/studentvue/types";

// Known Synergy endpoint paths — tried in order until one works
const SYNERGY_PATHS = [
  "/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
  "/Service/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/StudentVue/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
  "/StudentVue/Service/PXPCommunication.asmx/ProcessWebServiceRequest",
];

async function fetchStudentVueGradebook(
  districtUrl: string,
  username: string,
  password: string
): Promise<GradebookData> {
  const base = districtUrl.replace(/\/$/, "");

  const xmlParam = `<Parms><Param id="childIntID">0</Param></Parms>`;

  const payload = {
    userID: username,
    password: password,
    skipLoginLog: "true",
    parent: "false",
    webServiceHandleName: "PXPWebServices",
    methodName: "Gradebook",
    paramStr: xmlParam,
  };

  // Try JSON body first (PXP2 REST), fall back to form-encoded (older Synergy)
  const attempts = [
    {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/xml, */*",
        "Origin": base,
        "Referer": `${base}/`,
      },
    },
    {
      body: new URLSearchParams(payload).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Origin": base,
        "Referer": `${base}/`,
      },
    },
  ];

  let lastError = "";
  for (const path of SYNERGY_PATHS) {
    for (const attempt of attempts) {
      const res = await fetch(`${base}${path}`, { method: "POST", headers: attempt.headers, body: attempt.body });
      if (res.status === 404 || res.status === 405) break; // wrong path, try next

      const text = await res.text();

      // Unwrap JSON envelope if present: {"d":"<xml...>"}
      let xml = text;
      if (text.trimStart().startsWith("{")) {
        try {
          const json = JSON.parse(text);
          xml = json.d ?? json.data ?? text;
        } catch { /* not JSON */ }
      }

      // Auth error check
      if (
        xml.includes("Invalid user id or password") ||
        xml.includes("Login Failed") ||
        xml.includes("AuthFailed") ||
        xml.toLowerCase().includes("incorrect password")
      ) {
        throw new Error("Wrong username or password. Double-check your StudentVUE credentials.");
      }

      // Success — got gradebook XML
      if (xml.includes("<Gradebook") || xml.includes("<gradebook")) {
        return parseGradebook(xml);
      }

      // Got something but not gradebook — save snippet and try next format
      if (res.ok || res.status === 500) {
        lastError = xml.slice(0, 300).replace(/[\n\r]/g, " ");
      }
    }
  }

  throw new Error(lastError
    ? `School server responded but returned unexpected content: ${lastError}`
    : `Could not reach your school's grade portal. Check that your district is correct.`);
}

function getAttr(xml: string, ...attrs: string[]): string {
  for (const attr of attrs) {
    const m = xml.match(new RegExp(`(?:^|\\s)${attr}="([^"]*)"`, "i"));
    if (m && m[1] !== "") return m[1];
  }
  return "";
}

function parseGradebook(xml: string): GradebookData {
  const reportingPeriod =
    getAttr(xml, "ReportPeriod", "ReportingPeriod", "PeriodName") || "Current Period";

  const courseBlocks = xml.split(/<Course[\s>]/i).slice(1);

  const courses: CourseGrade[] = courseBlocks.map((block, idx) => {
    const name = getAttr(block, "Title", "CourseTitle", "CourseName") || `Course ${idx + 1}`;
    const teacher = getAttr(block, "Staff", "Teacher", "TeacherName") || "";
    const period = parseInt(getAttr(block, "Period") || "0");
    const room = getAttr(block, "Room") || "";
    const id = getAttr(block, "ID", "CourseID") || String(idx);

    // Mark block — try both self-closing and opening tag
    const markMatch = block.match(/<Mark\s[^>]*/i);
    const markBlock = markMatch ? markMatch[0] : block;

    // Try every known attribute name for the numeric grade
    const rawScore = getAttr(
      markBlock,
      "CalculatedScoreRaw", "ScoreRaw", "CalculatedScore",
      "Score", "Percent", "PercentageGrade"
    );
    // Letter grade
    const letter = getAttr(
      markBlock,
      "CalculatedScoreString", "ScoreString", "LetterGrade",
      "Grade", "Mark"
    ) || (rawScore ? "" : "N/A");

    const grade = rawScore !== "" && !isNaN(parseFloat(rawScore))
      ? parseFloat(rawScore)
      : null;

    // Categories — self-closing AssignmentGradeCalc tags
    const catMatches = block.match(/<AssignmentGradeCalc\s[^>]*\/?>/gi) || [];
    const categories: GradingCategory[] = catMatches.map((c) => ({
      name: getAttr(c, "Type", "Category", "Name") || "Category",
      weight: parseFloat(getAttr(c, "Weight") || "0"),
      score: parseFloat(getAttr(c, "Points", "Score") || "0"),
      maxScore: parseFloat(getAttr(c, "PointsPossible", "MaxPoints", "TotalPoints") || "0"),
    }));

    // Assignments
    const asnMatches = block.match(/<Assignment\s[^>]*\/?>/gi) || [];
    const assignments: Assignment[] = asnMatches.map((a, i) => {
      const scoreStr = getAttr(a, "Score", "StudentScore");
      const pointsStr = getAttr(a, "Points", "PointsPossible", "MaxScore");
      const maxScore = parseFloat(pointsStr) || 100;
      const notGraded = !scoreStr || scoreStr === "Not Graded" || scoreStr === "N/A" || scoreStr === "—";
      const score = notGraded ? null : parseFloat(scoreStr);
      return {
        id: getAttr(a, "GradebookID", "AssignmentID", "ID") || String(i),
        name: getAttr(a, "Measure", "Name", "AssignmentName") || "Assignment",
        category: getAttr(a, "Type", "Category") || "Assignment",
        score,
        maxScore,
        percentage: score !== null && maxScore > 0 ? (score / maxScore) * 100 : null,
        isDropped: getAttr(a, "DropScoreFlag", "Dropped") === "1",
        dueDate: getAttr(a, "DueDate", "Date") || "",
        notes: getAttr(a, "Notes", "Note") || "",
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
