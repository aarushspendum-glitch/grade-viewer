import { NextRequest, NextResponse } from "next/server";
import { detectCourseType, shouldExclude, type GPACourse } from "@/lib/gpa-configs";

const SYNERGY_PATHS = [
  "/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
  "/Service/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/PXPCommunication.asmx/ProcessWebServiceRequest",
  "/StudentVue/PXP2_CommunicationWebServiceRest.asmx/ProcessWebServiceRequest",
  "/StudentVue/Service/PXPCommunication.asmx/ProcessWebServiceRequest",
];

function getAttr(xml: string, ...attrs: string[]): string {
  for (const attr of attrs) {
    const m = xml.match(new RegExp(`(?:^|\\s)${attr}="([^"]*)"`, "i"));
    if (m && m[1] !== "") return m[1];
  }
  return "";
}

async function synergyCall(
  base: string,
  username: string,
  password: string,
  methodName: string,
  paramStr: string
): Promise<string> {
  const payload = { userID: username, password, skipLoginLog: "true", parent: "false", webServiceHandleName: "PXPWebServices", methodName, paramStr };
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/xml, */*",
    "Origin": base,
    "Referer": `${base}/`,
  };
  for (const path of SYNERGY_PATHS) {
    try {
      const res = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(payload) });
      if (res.status === 404 || res.status === 405) continue;
      let text = await res.text();
      if (text.trimStart().startsWith("{")) {
        try { text = JSON.parse(text).d ?? text; } catch { /* keep */ }
      }
      if (text.includes("Invalid user") || text.includes("Login Failed")) throw new Error("Invalid credentials");
      if (text.length > 100 && !text.includes("Runtime Error") && !text.includes("Internal Server Error")) return text;
    } catch (e) {
      if (e instanceof Error && e.message === "Invalid credentials") throw e;
    }
  }
  throw new Error(`Method ${methodName} not available`);
}

function letterToMidpoint(letter: string): number | null {
  const map: Record<string, number> = {
    "A+": 99, "A": 95, "A-": 91,
    "B+": 88, "B": 85, "B-": 81,
    "C+": 78, "C": 75, "C-": 71,
    "D+": 68, "D": 65, "D-": 61,
    "F": 50, "E": 50, "P": 95,
  };
  return map[letter.trim().toUpperCase()] ?? null;
}

function yearFromDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  const month = parseInt(parts[0]);
  const yr = parseInt(parts[2]);
  if (isNaN(month) || isNaN(yr)) return "";
  return month >= 7 ? `${yr}-${String(yr + 1).slice(2)}` : `${yr - 1}-${String(yr).slice(2)}`;
}

interface ReportPeriod { index: number; name: string; year: string; }

function parseReportingPeriods(xml: string): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  const matches = [...xml.matchAll(/<ReportPeriod\s[^>]*/gi)];
  for (const m of matches) {
    const block = m[0];
    const index = parseInt(getAttr(block, "Index") || "-1");
    const name = getAttr(block, "GradePeriod", "PeriodName", "Name");
    const startDate = getAttr(block, "StartDate");
    if (index < 0 || !name) continue;
    periods.push({ index, name, year: yearFromDate(startDate) });
  }
  return periods;
}

function parseGradebookCourses(xml: string, year: string): GPACourse[] {
  const courses: GPACourse[] = [];
  const courseBlocks = xml.split(/<Course[\s>]/i).slice(1);
  for (const block of courseBlocks) {
    const name = getAttr(block, "Title", "CourseTitle", "CourseName");
    if (!name || shouldExclude(name)) continue;
    const markMatch = block.match(/<Mark\s[^>]*/i);
    const markBlock = markMatch ? markMatch[0] : block;
    const rawScore = getAttr(markBlock, "CalculatedScoreRaw", "ScoreRaw", "CalculatedScore", "Score", "Percent");
    const grade = rawScore !== "" && !isNaN(parseFloat(rawScore)) ? parseFloat(rawScore) : null;
    if (!grade || grade <= 0) continue;
    courses.push({ id: `${name}-${year}-${Math.random().toString(36).slice(2,6)}`, name, grade, credits: 1, type: detectCourseType(name), year, excluded: false });
  }
  return courses;
}

// Parse transcript-style XML (GetStudentTranscript / GetReportCard)
function parseTranscriptXml(xml: string): GPACourse[] {
  const courses: GPACourse[] = [];

  // Format A: <TranscriptGroup GroupName="9th Grade (2022-23)"><Course CourseTitle="..." Mark="A" Credit="1" />
  const groupBlocks = xml.split(/<TranscriptGroup/i).slice(1);
  if (groupBlocks.length > 0) {
    for (const groupBlock of groupBlocks) {
      const groupName = getAttr("<TranscriptGroup " + groupBlock, "GroupName", "Year", "SchoolYear") || "";
      const yearMatch = groupName.match(/(\d{4}-\d{2,4})/);
      const year = yearMatch ? yearMatch[1] : groupName || "Prior";
      for (const block of groupBlock.split(/<Course[\s>]/i).slice(1)) {
        const course = parseSingleTranscriptCourse(block, year);
        if (course) courses.push(course);
      }
    }
    if (courses.length > 0) return courses;
  }

  // Format B: flat <Course> with SchoolYear attr
  for (const block of xml.split(/<Course[\s>]/i).slice(1)) {
    const dateStr = getAttr(block, "StartDate", "SchoolYear");
    const year = yearFromDate(dateStr) || getAttr(block, "SchoolYear", "Year") || "Prior";
    const course = parseSingleTranscriptCourse(block, year);
    if (course) courses.push(course);
  }
  return courses;
}

function parseSingleTranscriptCourse(block: string, year: string): GPACourse | null {
  const name = getAttr(block, "CourseTitle", "Title", "CourseName", "Course");
  if (!name || shouldExclude(name)) return null;
  const creditStr = getAttr(block, "CreditEarned", "Credit", "Credits", "CreditAttempted");
  const credits = parseFloat(creditStr) || 1.0;
  const pctStr = getAttr(block, "CalculatedScoreRaw", "Percent", "PercentageGrade", "NumericGrade", "Score");
  const gradeStr = getAttr(block, "Mark", "MarkName", "Grade", "FinalGrade", "LetterGrade", "FinalMark");
  let grade: number | null = null;
  if (pctStr && !isNaN(parseFloat(pctStr))) grade = parseFloat(pctStr);
  else if (gradeStr) grade = letterToMidpoint(gradeStr);
  if (!grade || grade <= 0) return null;
  return { id: `${name}-${year}-${Math.random().toString(36).slice(2,6)}`, name, grade, credits, type: detectCourseType(name), year, excluded: false };
}

export async function POST(request: NextRequest) {
  const { username, password, districtUrl } = await request.json();
  if (!username || !password || !districtUrl) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

  const base = districtUrl.replace(/\/$/, "");
  const debugLog: string[] = [];

  try {
    // Step 1: fetch current gradebook + list of reporting periods for this year
    const currentXml = await synergyCall(base, username, password, "Gradebook", `<Parms><Param id="childIntID">0</Param></Parms>`);
    const allPeriods = parseReportingPeriods(currentXml);
    debugLog.push(`Gradebook periods found: ${allPeriods.length} — ${allPeriods.map(p => `[${p.index}]${p.name}(${p.year})`).join(", ")}`);

    // Determine current year from first period's year or default
    const currentYear = allPeriods[0]?.year || new Date().getFullYear() + "-" + String(new Date().getFullYear() + 1).slice(2);

    // Parse current gradebook courses
    const allCourses: GPACourse[] = parseGradebookCourses(currentXml, currentYear);
    const seenKeys = new Set(allCourses.map(c => `${c.name}-${c.year}`));

    // Step 2: fetch each reporting period for this year (for semester averages)
    const semesterPeriods = allPeriods.filter(p =>
      ["semester", "annual", "final", "s1", "s2", "exam", "year"].some(k => p.name.toLowerCase().includes(k))
    );
    const periodsToFetch = semesterPeriods.length > 0 ? semesterPeriods : allPeriods;

    await Promise.allSettled(periodsToFetch.map(async (period) => {
      try {
        const xml = await synergyCall(base, username, password, "Gradebook", `<Parms><Param id="childIntID">0</Param><Param id="ReportPeriod">${period.index}</Param></Parms>`);
        const courses = parseGradebookCourses(xml, period.year || currentYear);
        for (const c of courses) {
          const key = `${c.name}-${c.year}`;
          if (!seenKeys.has(key)) { seenKeys.add(key); allCourses.push(c); }
        }
      } catch { /* skip */ }
    }));

    // Step 3: try methods that may return historical/transcript data
    const historyMethods = [
      { method: "GetStudentTranscript",   params: `<Parms><Param id="childIntID">0</Param></Parms>` },
      { method: "GetReportCard",          params: `<Parms><Param id="childIntID">0</Param></Parms>` },
      { method: "GetStudentTranscript",   params: `<Parms></Parms>` },
      { method: "GetStudentGradeBook",    params: `<Parms><Param id="childIntID">0</Param></Parms>` },
      { method: "GetStudentGradeHistory", params: `<Parms><Param id="childIntID">0</Param></Parms>` },
      { method: "StudentTranscript",      params: `<Parms><Param id="childIntID">0</Param></Parms>` },
    ];

    for (const { method, params } of historyMethods) {
      try {
        const xml = await synergyCall(base, username, password, method, params);
        debugLog.push(`${method}: got ${xml.length} chars — snippet: ${xml.slice(0, 120).replace(/\n/g, " ")}`);
        const historyCourses = parseTranscriptXml(xml);
        if (historyCourses.length > 0) {
          debugLog.push(`${method}: parsed ${historyCourses.length} courses`);
          for (const c of historyCourses) {
            const key = `${c.name}-${c.year}`;
            if (!seenKeys.has(key)) { seenKeys.add(key); allCourses.push(c); }
          }
          break; // found historical data, stop trying
        }
      } catch (e) {
        debugLog.push(`${method}: failed — ${e instanceof Error ? e.message : "error"}`);
      }
    }

    return NextResponse.json({
      courses: allCourses,
      periodsFound: allPeriods.length,
      debug: debugLog.join(" | "),
    });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed", debug: debugLog.join(" | ") }, { status: 500 });
  }
}
