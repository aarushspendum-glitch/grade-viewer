import { NextRequest, NextResponse } from "next/server";
import { detectCourseType, shouldExclude, type GPACourse } from "@/lib/gpa-configs";

const SYNERGY_PATHS = [
  "/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
  "/Service/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/StudentVue/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
  "/StudentVue/Service/PXPCommunication.asmx/ProcessWebServiceRequest",
];

async function synergyRequest(
  base: string,
  methodName: string,
  paramStr: string,
  username: string,
  password: string
): Promise<string> {
  const payload = {
    userID: username,
    password,
    skipLoginLog: "true",
    parent: "false",
    webServiceHandleName: "PXPWebServices",
    methodName,
    paramStr,
  };
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/xml, */*",
    "Origin": base,
    "Referer": `${base}/`,
  };

  for (const path of SYNERGY_PATHS) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.status === 404 || res.status === 405) continue;
      let text = await res.text();
      if (text.trimStart().startsWith("{")) {
        try { text = JSON.parse(text).d ?? text; } catch { /* keep */ }
      }
      if (text.includes("Invalid user") || text.includes("Login Failed")) {
        throw new Error("Invalid credentials");
      }
      if (text.length > 50) return text;
    } catch (e) {
      if (e instanceof Error && e.message === "Invalid credentials") throw e;
      continue;
    }
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

function parseTranscript(xml: string): GPACourse[] {
  const courses: GPACourse[] = [];

  // Format 1: <TranscriptGroup GroupName="9th Grade (2022-23)"><Course CourseTitle="..." />
  // Format 2: <Course Title="..." SchoolYear="..." /> flat list
  // Format 3: <ReportPeriod><Course ... /> nested under year groups

  // Try to find year groups first
  const groupPattern = /<TranscriptGroup[^>]*>/gi;
  const groupMatches = [...xml.matchAll(groupPattern)];

  if (groupMatches.length > 0) {
    // Split by TranscriptGroup
    const groupBlocks = xml.split(/<TranscriptGroup/i).slice(1);
    for (const groupBlock of groupBlocks) {
      const groupName = getAttr("<TranscriptGroup " + groupBlock, "GroupName", "Year", "SchoolYear") || "";
      // Pull year from group name (e.g. "9th Grade (2022-23)" → "2022-23")
      const yearMatch = groupName.match(/(\d{4}-\d{2,4})/);
      const year = yearMatch ? yearMatch[1] : groupName || "Prior Year";

      const courseBlocks = groupBlock.split(/<Course[\s>]/i).slice(1);
      for (const block of courseBlocks) {
        const course = parseCourseBlock(block, year);
        if (course) courses.push(course);
      }
    }
    if (courses.length > 0) return courses;
  }

  // Flat <Course> blocks with SchoolYear attribute
  const courseBlocks = xml.split(/<Course[\s>]/i).slice(1);
  for (const block of courseBlocks) {
    const year = getAttr(block, "SchoolYear", "Year", "GradeLevel") || "";
    const course = parseCourseBlock(block, year);
    if (course) courses.push(course);
  }

  return courses;
}

function parseCourseBlock(block: string, year: string): GPACourse | null {
  const name = getAttr(block, "CourseTitle", "Title", "CourseName", "Course");
  if (!name) return null;

  const creditStr = getAttr(block, "CreditEarned", "Credit", "Credits", "CreditAttempted", "TotalCredit");
  const credits = parseFloat(creditStr) || 1.0;

  // Get numeric grade first, then fall back to letter
  const pctStr = getAttr(block, "CalculatedScoreRaw", "Percent", "PercentageGrade", "NumericGrade", "Score", "FinalScore");
  const gradeStr = getAttr(block, "Mark", "MarkName", "Grade", "FinalGrade", "LetterGrade", "FinalMark");

  let grade: number | null = null;
  if (pctStr && !isNaN(parseFloat(pctStr))) {
    grade = parseFloat(pctStr);
  } else if (gradeStr) {
    grade = letterToMidpoint(gradeStr);
  }

  if (grade === null || grade <= 0) return null;

  return {
    id: `${name}-${year}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    grade,
    credits,
    type: detectCourseType(name),
    year: year || "Prior",
    excluded: shouldExclude(name),
  };
}

export async function POST(request: NextRequest) {
  const { username, password, districtUrl } = await request.json();
  if (!username || !password || !districtUrl) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const base = districtUrl.replace(/\/$/, "");

  // Try multiple method names — Synergy districts vary
  const methods = [
    { name: "GetStudentTranscript", params: `<Parms><Param id="childIntID">0</Param></Parms>` },
    { name: "StudentTranscript",    params: `<Parms><Param id="childIntID">0</Param></Parms>` },
    { name: "GetStudentTranscript", params: `<Parms></Parms>` },
  ];

  let lastRaw = "";
  for (const method of methods) {
    try {
      const xml = await synergyRequest(base, method.name, method.params, username, password);
      lastRaw = xml.slice(0, 800);

      const courses = parseTranscript(xml);
      if (courses.length > 0) {
        return NextResponse.json({ courses });
      }
      // Got XML but no courses — save for debug and try next method
    } catch {
      // method not available, try next
    }
  }

  // Nothing worked — return debug info so we can see what the server actually sends
  return NextResponse.json({
    courses: [],
    error: "Could not parse transcript from your school's system.",
    debug: lastRaw,
  });
}
