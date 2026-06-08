import { NextRequest, NextResponse } from "next/server";
import { detectCourseType, shouldExclude, type GPACourse } from "@/lib/gpa-configs";

const SYNERGY_PATHS = [
  "/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
  "/Service/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/StudentVue/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
];

async function synergyRequest(
  base: string,
  methodName: string,
  paramStr: string,
  username: string,
  password: string
): Promise<string> {
  const payload = { userID: username, password, skipLoginLog: "true", parent: "false", webServiceHandleName: "PXPWebServices", methodName, paramStr };
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/xml, */*",
    "Origin": base,
    "Referer": `${base}/`,
  };

  for (const path of SYNERGY_PATHS) {
    const res = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(payload) });
    if (res.status === 404 || res.status === 405) continue;
    let text = await res.text();
    if (text.trimStart().startsWith("{")) {
      try { text = JSON.parse(text).d ?? text; } catch { /* keep */ }
    }
    if (text.includes("Invalid user") || text.includes("Login Failed")) {
      throw new Error("Invalid credentials");
    }
    return text;
  }
  throw new Error("Could not reach school portal");
}

function getAttr(xml: string, ...attrs: string[]): string {
  for (const attr of attrs) {
    const m = xml.match(new RegExp(`(?:^|\\s)${attr}="([^"]*)"`, "i"));
    if (m && m[1] !== "") return m[1];
  }
  return "";
}

function parseTranscript(xml: string): GPACourse[] {
  const courses: GPACourse[] = [];

  // Try <Course> blocks in transcript
  const courseBlocks = xml.split(/<Course[\s>]/i).slice(1);
  for (const block of courseBlocks) {
    const name = getAttr(block, "CourseTitle", "Title", "CourseName");
    if (!name) continue;

    const creditStr = getAttr(block, "CreditEarned", "Credit", "Credits", "CreditAttempted");
    const credits = parseFloat(creditStr) || 1.0;

    // Get the final mark — look for <Mark> or grade attributes
    const markBlock = block.match(/<Mark[^>]*>/i)?.[0] ?? block;
    const gradeStr = getAttr(markBlock, "MarkName", "Grade", "FinalGrade", "Score");
    const pctStr = getAttr(markBlock, "CalculatedScoreRaw", "Percent", "PercentageGrade", "NumericGrade");

    let grade: number | null = null;
    if (pctStr && !isNaN(parseFloat(pctStr))) {
      grade = parseFloat(pctStr);
    } else if (gradeStr) {
      // Convert letter to midpoint estimate
      grade = letterToMidpoint(gradeStr);
    }

    if (grade === null) continue;

    const year = getAttr(block, "SchoolYear", "Year", "GradeLevel") || "";

    courses.push({
      id: `${name}-${year}-${Math.random()}`,
      name,
      grade,
      credits,
      type: detectCourseType(name),
      year,
      excluded: shouldExclude(name),
    });
  }

  return courses;
}

function letterToMidpoint(letter: string): number | null {
  const map: Record<string, number> = {
    "A+": 99, "A": 95, "A-": 91,
    "B+": 88, "B": 85, "B-": 81,
    "C+": 78, "C": 75, "C-": 71,
    "D+": 68, "D": 65, "D-": 61,
    "F": 50, "E": 50,
  };
  return map[letter.trim().toUpperCase()] ?? null;
}

export async function POST(request: NextRequest) {
  const { username, password, districtUrl } = await request.json();
  if (!username || !password || !districtUrl) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const base = districtUrl.replace(/\/$/, "");

  try {
    // Try transcript first
    const transcriptXml = await synergyRequest(
      base,
      "GetStudentTranscript",
      `<Parms><Param id="childIntID">0</Param></Parms>`,
      username,
      password
    );

    const courses = parseTranscript(transcriptXml);
    return NextResponse.json({ courses, raw: transcriptXml.slice(0, 500) });
  } catch {
    // Fall back to current gradebook if transcript not available
    return NextResponse.json({ courses: [], error: "Transcript not available for this district" });
  }
}
