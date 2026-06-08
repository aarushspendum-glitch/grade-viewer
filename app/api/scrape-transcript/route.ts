import { NextRequest, NextResponse } from "next/server";
import { detectCourseType, shouldExclude, type GPACourse } from "@/lib/gpa-configs";

// Scrapes the StudentVUE *browser* web app to get transcript/grade history.
// Flow: GET login page → extract hidden fields → POST credentials → get session
// cookie → fetch transcript page → parse HTML table rows.

function letterToMidpoint(letter: string): number | null {
  const map: Record<string, number> = {
    "A+": 99, "A": 95, "A-": 91,
    "B+": 88, "B": 85, "B-": 81,
    "C+": 78, "C": 75, "C-": 71,
    "D+": 68, "D": 65, "D-": 61,
    "F": 50, "E": 50, "P": 95, "WP": 70,
  };
  return map[letter.trim().toUpperCase()] ?? null;
}

function extractHidden(html: string, name: string): string {
  const m = html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`, "i"))
    || html.match(new RegExp(`value="([^"]*)"[^>]*name="${name}"`, "i"));
  return m ? m[1] : "";
}

function extractCookies(headers: Headers): string {
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length) return raw.map(c => c.split(";")[0]).join("; ");
  // fallback for older Node
  const single = headers.get("set-cookie") ?? "";
  return single.split(",").map(c => c.trim().split(";")[0]).join("; ");
}

async function getWithCookies(url: string, cookie: string): Promise<{ html: string; cookies: string }> {
  const res = await fetch(url, {
    headers: {
      "Cookie": cookie,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  const html = await res.text();
  const newCookies = extractCookies(res.headers);
  const merged = mergeCookies(cookie, newCookies);
  return { html, cookies: merged };
}

function mergeCookies(existing: string, incoming: string): string {
  const map: Record<string, string> = {};
  for (const part of (existing + "; " + incoming).split(";")) {
    const [k, v] = part.trim().split("=");
    if (k && v !== undefined) map[k.trim()] = v.trim();
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join("; ");
}

// Parse grade history from Synergy HTML — handles multiple table formats
function parseGradeHistoryHtml(html: string): GPACourse[] {
  const courses: GPACourse[] = [];

  // Strategy 1: Look for transcript table rows
  // Typical format: <tr class="..."> <td>Course Name</td> <td>Credits</td> <td>Grade</td> <td>Year</td> </tr>

  // Extract all <tr> blocks
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  let currentYear = "";

  for (const row of rows) {
    // Detect year header rows (e.g. "Grade 9 (2022-2023)" or "2022-23")
    const yearMatch = row.match(/(\d{4}[-–]\d{2,4})/);
    if (yearMatch) {
      const raw = yearMatch[1].replace("–", "-");
      // Normalize to "YYYY-YY" format
      const parts = raw.split("-");
      if (parts[0].length === 4) {
        const yr = parseInt(parts[0]);
        const suffix = parts[1].length === 4 ? String(parseInt(parts[1])).slice(2) : parts[1];
        currentYear = `${yr}-${suffix}`;
      }
    }

    // Extract <td> text content
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim());

    if (cells.length < 2) continue;

    // Try to find course name, grade, credits from cells
    let name = "", gradeStr = "", creditStr = "";

    // Look for a cell that looks like a course name (long text, not a number)
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.length > 4 && isNaN(parseFloat(cell)) && !cell.match(/^\d+[\/-]\d+/)) {
        if (!name && !shouldExclude(cell)) { name = cell; continue; }
      }
      // Credit: small number 0.5–2
      if (!creditStr && cell.match(/^[0-9]+\.?[05]?$/) && parseFloat(cell) <= 4) {
        creditStr = cell; continue;
      }
      // Grade: letter or percentage
      if (!gradeStr && (cell.match(/^[ABCDF][+-]?$/) || cell.match(/^\d{1,3}\.?\d*%?$/))) {
        gradeStr = cell; continue;
      }
    }

    if (!name) continue;

    let grade: number | null = null;
    const pct = parseFloat(gradeStr.replace("%", ""));
    if (!isNaN(pct) && pct > 0) {
      grade = pct;
    } else if (gradeStr) {
      grade = letterToMidpoint(gradeStr);
    }
    if (!grade || grade <= 0) continue;

    const credits = parseFloat(creditStr) || 1;
    const year = currentYear || "Prior";

    courses.push({
      id: `${name}-${year}-${Math.random().toString(36).slice(2, 6)}`,
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

export async function POST(request: NextRequest) {
  const { username, password, districtUrl } = await request.json();
  if (!username || !password || !districtUrl) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const base = districtUrl.replace(/\/$/, "");
  const debugLog: string[] = [];

  try {
    // ── Step 1: GET the login page to grab hidden form fields + initial cookies ──
    const loginUrl = `${base}/PXP2_Login.aspx`;
    debugLog.push(`GET ${loginUrl}`);

    const loginPageRes = await fetch(loginUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    const loginHtml = await loginPageRes.text();
    let cookies = extractCookies(loginPageRes.headers);
    debugLog.push(`Login page status: ${loginPageRes.status}, cookies: ${cookies.slice(0, 80)}`);
    debugLog.push(`Login page length: ${loginHtml.length}`);

    // Extract hidden fields (ASP.NET ViewState etc.)
    const viewState = extractHidden(loginHtml, "__VIEWSTATE");
    const eventValidation = extractHidden(loginHtml, "__EVENTVALIDATION");
    const viewStateGen = extractHidden(loginHtml, "__VIEWSTATEGENERATOR");

    // Find the username/password input names
    const userInputName = loginHtml.match(/name="(ctl\w*UserName|txtUserName|tbUsername|username)"[^>]*type="text"/i)?.[1]
      || loginHtml.match(/type="text"[^>]*name="(ctl\w*UserName|txtUserName|tbUsername|username)"/i)?.[1]
      || "ctl00$MainContent$username";
    const passInputName = loginHtml.match(/name="(ctl\w*Password|txtPassword|tbPassword|password)"[^>]*type="password"/i)?.[1]
      || loginHtml.match(/type="password"[^>]*name="(ctl\w*Password|txtPassword|tbPassword|password)"/i)?.[1]
      || "ctl00$MainContent$password";
    const submitName = loginHtml.match(/name="(ctl\w*LoginBtn|btnLogin|login[Bb]tn)"[^>]*type="submit"/i)?.[1]
      || "ctl00$MainContent$LoginButton";

    debugLog.push(`Form fields: user=${userInputName} pass=${passInputName} submit=${submitName}`);

    // ── Step 2: POST login form ────────────────────────────────────────────────
    const formData = new URLSearchParams({
      __VIEWSTATE: viewState,
      __EVENTVALIDATION: eventValidation,
      __VIEWSTATEGENERATOR: viewStateGen,
      [userInputName]: username,
      [passInputName]: password,
      [submitName]: "Login",
    });

    const loginPostRes = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
        "Referer": loginUrl,
        "Origin": base,
      },
      body: formData.toString(),
      redirect: "follow",
    });

    const loginPostHtml = await loginPostRes.text();
    cookies = mergeCookies(cookies, extractCookies(loginPostRes.headers));
    debugLog.push(`POST login status: ${loginPostRes.status}, url: ${loginPostRes.url}`);

    // Check if login failed
    if (loginPostHtml.includes("Invalid") || loginPostHtml.includes("incorrect") || loginPostHtml.toLowerCase().includes("login failed")) {
      return NextResponse.json({ error: "Invalid credentials", debug: debugLog.join(" | ") }, { status: 401 });
    }

    if (!cookies.includes("ASP.NET_SessionId") && !cookies.includes("PXP") && loginPostRes.url.includes("Login")) {
      debugLog.push(`May not be logged in — redirected back to login? html snippet: ${loginPostHtml.slice(0, 200)}`);
    }

    // ── Step 3: Try known transcript/grade history URLs ───────────────────────
    const transcriptUrls = [
      `${base}/PXP2_Transcript.aspx`,
      `${base}/PXP2_GradeHistory.aspx`,
      `${base}/PXP2_Transcript.aspx?AGU=0`,
      `${base}/PXP2_ReportCards.aspx`,
    ];

    let bestHtml = "";
    let bestCourseCount = 0;

    for (const url of transcriptUrls) {
      try {
        const { html } = await getWithCookies(url, cookies);
        debugLog.push(`GET ${url.split("/").pop()}: ${html.length} chars`);
        const courses = parseGradeHistoryHtml(html);
        debugLog.push(`  → parsed ${courses.length} courses`);
        if (courses.length > bestCourseCount) {
          bestCourseCount = courses.length;
          bestHtml = html;
        }
      } catch (e) {
        debugLog.push(`  → error: ${e instanceof Error ? e.message : "failed"}`);
      }
    }

    if (bestCourseCount === 0) {
      // Return debug so we can see what the pages look like
      return NextResponse.json({
        courses: [],
        error: "Logged in but could not parse transcript. Check debug.",
        debug: debugLog.join(" | "),
        htmlSnippet: bestHtml.slice(0, 1000),
      });
    }

    const courses = parseGradeHistoryHtml(bestHtml);
    return NextResponse.json({ courses, debug: debugLog.join(" | ") });

  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Scrape failed",
      debug: debugLog.join(" | "),
    }, { status: 500 });
  }
}
