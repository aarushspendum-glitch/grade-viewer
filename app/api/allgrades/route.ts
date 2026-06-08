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

async function fetchGradebook(
  base: string,
  username: string,
  password: string,
  periodIndex?: number
): Promise<string> {
  const paramStr = periodIndex !== undefined
    ? `<Parms><Param id="childIntID">0</Param><Param id="ReportPeriod">${periodIndex}</Param></Parms>`
    : `<Parms><Param id="childIntID">0</Param></Parms>`;

  const payload = {
    userID: username,
    password,
    skipLoginLog: "true",
    parent: "false",
    webServiceHandleName: "PXPWebServices",
    methodName: "Gradebook",
    paramStr,
  };

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/xml, */*",
    "Origin": base,
    "Referer": `${base}/`,
  };

  for (const path of SYNERGY_PATHS) {
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
    if (text.includes("<Gradebook") || text.includes("<gradebook")) return text;
  }
  throw new Error("Could not reach gradebook");
}

interface ReportPeriod {
  index: number;
  name: string;
  year: string;
}

function parseReportingPeriods(xml: string): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  // Match all <ReportPeriod Index="..." GradePeriod="..." /> tags
  const matches = xml.matchAll(/<ReportPeriod\s[^>]*/gi);
  for (const m of matches) {
    const block = m[0];
    const index = parseInt(getAttr(block, "Index") || "-1");
    const name = getAttr(block, "GradePeriod", "PeriodName", "Name");
    const startDate = getAttr(block, "StartDate");
    if (index < 0 || !name) continue;

    // Derive school year from start date (e.g. "09/02/2023" → "2023-24")
    let year = "";
    if (startDate) {
      const parts = startDate.split("/");
      const month = parseInt(parts[0]);
      const yr = parseInt(parts[2]);
      year = month >= 7 ? `${yr}-${String(yr + 1).slice(2)}` : `${yr - 1}-${String(yr).slice(2)}`;
    }

    periods.push({ index, name, year });
  }
  return periods;
}

function parseCourses(xml: string, year: string): GPACourse[] {
  const courses: GPACourse[] = [];
  const courseBlocks = xml.split(/<Course[\s>]/i).slice(1);

  for (const block of courseBlocks) {
    const name = getAttr(block, "Title", "CourseTitle", "CourseName");
    if (!name) continue;
    if (shouldExclude(name)) continue;

    const markMatch = block.match(/<Mark\s[^>]*/i);
    const markBlock = markMatch ? markMatch[0] : block;

    const rawScore = getAttr(markBlock,
      "CalculatedScoreRaw", "ScoreRaw", "CalculatedScore",
      "Score", "Percent", "PercentageGrade"
    );
    const grade = rawScore !== "" && !isNaN(parseFloat(rawScore)) ? parseFloat(rawScore) : null;
    if (grade === null || grade <= 0) continue;

    courses.push({
      id: `${name}-${year}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      grade,
      credits: 1,
      type: detectCourseType(name),
      year,
      excluded: false,
    });
  }
  return courses;
}

export async function POST(request: NextRequest) {
  const { username, password, districtUrl } = await request.json();
  if (!username || !password || !districtUrl) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const base = districtUrl.replace(/\/$/, "");

  try {
    // 1. Fetch current gradebook to get list of all reporting periods
    const currentXml = await fetchGradebook(base, username, password);
    const periods = parseReportingPeriods(currentXml);

    // Get current year from current gradebook
    const currentPeriodName = getAttr(currentXml, "GradePeriod") || "Current";
    const currentStartDate = getAttr(currentXml, "StartDate");
    let currentYear = "Current";
    if (currentStartDate) {
      const parts = currentStartDate.split("/");
      const month = parseInt(parts[0]);
      const yr = parseInt(parts[2]);
      currentYear = month >= 7 ? `${yr}-${String(yr + 1).slice(2)}` : `${yr - 1}-${String(yr).slice(2)}`;
    }

    // 2. Parse current period courses
    const allCourses: GPACourse[] = parseCourses(currentXml, currentYear);
    const seenKeys = new Set(allCourses.map((c) => `${c.name}-${c.year}`));

    // 3. Fetch each past period (skip current — already have it)
    // Only fetch "final" periods (semester/annual) to avoid duplicates from quarters
    const finalKeywords = ["semester", "annual", "final", "year", "s1", "s2", "exam"];
    const finalPeriods = periods.filter((p) =>
      finalKeywords.some((k) => p.name.toLowerCase().includes(k))
    );
    // If no final periods found, use all periods
    const periodsToFetch = finalPeriods.length > 0 ? finalPeriods : periods;

    await Promise.allSettled(
      periodsToFetch.map(async (period) => {
        try {
          const xml = await fetchGradebook(base, username, password, period.index);
          const year = period.year || currentYear;
          const courses = parseCourses(xml, year);
          for (const c of courses) {
            const key = `${c.name}-${c.year}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              allCourses.push(c);
            }
          }
        } catch { /* skip failed periods */ }
      })
    );

    return NextResponse.json({ courses: allCourses, periodsFound: periods.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
