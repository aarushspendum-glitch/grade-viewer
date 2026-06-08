import { NextRequest, NextResponse } from "next/server";
import { detectCourseType, shouldExclude, type GPACourse } from "@/lib/gpa-configs";

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

function extractHidden(html: string, name: string): string {
  const m = html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`, "i"))
    || html.match(new RegExp(`value="([^"]*)"[^>]*name="${name}"`, "i"));
  return m ? m[1] : "";
}

function getCookies(headers: Headers): string {
  try {
    const raw = headers.getSetCookie();
    if (raw?.length) return raw.map(c => c.split(";")[0]).join("; ");
  } catch { /* older Node fallback */ }
  return (headers.get("set-cookie") ?? "").split(",").map(c => c.trim().split(";")[0]).join("; ");
}

function mergeCookies(a: string, b: string): string {
  const map: Record<string, string> = {};
  for (const part of `${a}; ${b}`.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) map[k] = v;
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join("; ");
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function parseTranscriptHtml(html: string, debugLog: string[]): GPACourse[] {
  const courses: GPACourse[] = [];
  let currentYear = "";

  // Split HTML into rows
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[0]);
  debugLog.push(`Rows found: ${rows.length}`);

  for (const row of rows) {
    // Strip inner tags to get text per cell
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
      )
      .filter(c => c.length > 0);

    if (cells.length === 0) continue;

    // Detect a year-group header row — contains a school year pattern
    const fullRow = cells.join(" ");
    const yearMatch = fullRow.match(/(\d{4})\s*[-–]\s*(\d{2,4})/);
    if (yearMatch) {
      const yr = parseInt(yearMatch[1]);
      const suffix = yearMatch[2].length === 4 ? yearMatch[2].slice(2) : yearMatch[2];
      currentYear = `${yr}-${suffix}`;
      debugLog.push(`Year group found: ${currentYear}`);
      continue;
    }

    if (cells.length < 2) continue;

    // Try to identify columns: usually [CourseTitle, ..., Credits, Grade]
    // or [CourseTitle, Grade, Credits, ...]
    let name = "";
    let gradeStr = "";
    let creditStr = "";

    for (const cell of cells) {
      // Course name: long text, not numeric, not short code
      if (!name && cell.length > 5 && isNaN(parseFloat(cell)) && !/^\d/.test(cell) && !shouldExclude(cell)) {
        name = cell;
        continue;
      }
      // Letter grade: A, B+, C-, etc.
      if (!gradeStr && /^[ABCDFPW][+-]?$/.test(cell)) {
        gradeStr = cell;
        continue;
      }
      // Numeric grade: 85, 92.4, etc. (between 50-100)
      if (!gradeStr) {
        const n = parseFloat(cell.replace("%", ""));
        if (!isNaN(n) && n >= 50 && n <= 100) { gradeStr = String(n); continue; }
      }
      // Credits: 0.5, 1, 1.5 etc.
      if (!creditStr) {
        const n = parseFloat(cell);
        if (!isNaN(n) && n > 0 && n <= 4 && cell.match(/^\d+\.?\d*$/)) { creditStr = cell; continue; }
      }
    }

    if (!name || !gradeStr) continue;

    let grade: number | null = null;
    const pct = parseFloat(gradeStr.replace("%", ""));
    if (!isNaN(pct) && pct >= 50) grade = pct;
    else grade = letterToMidpoint(gradeStr);

    if (!grade) continue;

    courses.push({
      id: `${name}-${currentYear}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      grade,
      credits: parseFloat(creditStr) || 1,
      type: detectCourseType(name),
      year: currentYear || "Prior",
      excluded: shouldExclude(name),
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
  const debugLog: string[] = [];

  try {
    // ── Step 1: GET login page (follow redirect to _Student_OVR page) ─────────
    const loginBase = `${base}/PXP2_Login.aspx`;
    const step1 = await fetch(loginBase, { headers: BROWSER_HEADERS, redirect: "follow" });
    const loginHtml = await step1.text();
    let cookies = getCookies(step1.headers);
    const finalLoginUrl = step1.url; // e.g. .../PXP2_Login_Student_OVR.aspx?regenerateSessionId=true

    debugLog.push(`Login page: ${step1.status} → ${finalLoginUrl}`);
    debugLog.push(`Cookies after GET: ${cookies.slice(0, 120)}`);

    const viewState      = extractHidden(loginHtml, "__VIEWSTATE");
    const viewStateGen   = extractHidden(loginHtml, "__VIEWSTATEGENERATOR");
    const eventValidation = extractHidden(loginHtml, "__EVENTVALIDATION");
    debugLog.push(`ViewState length: ${viewState.length}`);

    // ── Step 2: POST credentials to the FINAL (redirected) login URL ──────────
    const formBody = new URLSearchParams({
      __VIEWSTATE:           viewState,
      __VIEWSTATEGENERATOR:  viewStateGen,
      __EVENTVALIDATION:     eventValidation,
      "ctl00$MainContent$username": username,
      "ctl00$MainContent$password": password,
      "ctl00$MainContent$Submit1":  "Login",
    });

    const step2 = await fetch(finalLoginUrl, {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookies,
        "Referer": finalLoginUrl,
        "Origin": base,
      },
      body: formBody.toString(),
      redirect: "follow",
    });

    const postHtml = await step2.text();
    cookies = mergeCookies(cookies, getCookies(step2.headers));
    debugLog.push(`POST login: ${step2.status} → ${step2.url}`);
    debugLog.push(`Cookies after POST: ${cookies.slice(0, 200)}`);

    if (postHtml.toLowerCase().includes("invalid") || step2.url.includes("Login")) {
      debugLog.push(`Login may have failed — still on login page or invalid msg`);
    }

    // ── Step 3: Fetch transcript / grade history pages ─────────────────────────
    const pageUrls = [
      `${base}/PXP2_Transcript.aspx`,
      `${base}/PXP2_GradeHistory.aspx`,
      `${base}/PXP2_Transcript.aspx?AGU=0`,
      `${base}/PXP2_ReportCards.aspx`,
    ];

    let bestCourses: GPACourse[] = [];
    let bestHtmlSnippet = "";

    for (const url of pageUrls) {
      try {
        const res = await fetch(url, {
          headers: { ...BROWSER_HEADERS, "Cookie": cookies, "Referer": step2.url },
          redirect: "follow",
        });
        const html = await res.text();
        debugLog.push(`${url.split("/").pop()}: ${res.status}, ${html.length} chars`);

        // If redirected back to login, skip
        if (res.url.includes("Login")) { debugLog.push("  → redirected to login (not authenticated)"); continue; }

        const parsed = parseTranscriptHtml(html, debugLog);
        debugLog.push(`  → parsed ${parsed.length} courses`);

        if (parsed.length > bestCourses.length) {
          bestCourses = parsed;
          bestHtmlSnippet = html.slice(0, 2000);
        }
      } catch (e) {
        debugLog.push(`  → error: ${e instanceof Error ? e.message : "failed"}`);
      }
    }

    if (bestCourses.length === 0) {
      return NextResponse.json({
        courses: [],
        error: "Logged in but no transcript courses found.",
        debug: debugLog.join(" | "),
        htmlSnippet: bestHtmlSnippet.slice(0, 1500),
      });
    }

    return NextResponse.json({ courses: bestCourses, debug: debugLog.join(" | ") });

  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Scrape failed",
      debug: debugLog.join(" | "),
    }, { status: 500 });
  }
}
