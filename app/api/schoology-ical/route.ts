import { NextRequest, NextResponse } from "next/server";

export interface CalEvent {
  uid: string;
  title: string;
  description: string;
  start: string;   // ISO string
  end: string;     // ISO string
  allDay: boolean;
  course: string;  // extracted from CATEGORIES / description / title
  type: "assignment" | "event" | "test" | "other";
}

function parseICalDate(val: string): string {
  // DATE-TIME: 20250115T230000Z or 20250115T230000
  // DATE: 20250115
  val = val.trim().replace(/^.*:/, ""); // strip TZID= prefix
  if (val.length === 8) {
    // All-day date
    return `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T00:00:00.000Z`;
  }
  const y = val.slice(0,4), mo = val.slice(4,6), d = val.slice(6,8);
  const h = val.slice(9,11), m = val.slice(11,13), s = val.slice(13,15);
  const utc = val.endsWith("Z") ? "Z" : "";
  return `${y}-${mo}-${d}T${h}:${m}:${s}${utc || ".000"}`;
}

function unescape(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function detectType(title: string, url: string): CalEvent["type"] {
  // URL is the most reliable signal: /assignment/ vs /event/ vs /discussion/
  if (/\/assignment\//i.test(url) || /\/discussion\//i.test(url)) {
    // Further refine by title keywords
    const t = title.toLowerCase();
    if (/\b(test|quiz|exam|assessment|retake|midterm|final)\b/.test(t)) return "test";
    return "assignment";
  }
  if (/\/event\//i.test(url)) return "event";
  // Fall back to title keywords
  const t = title.toLowerCase();
  if (/\b(test|quiz|exam|assessment|retake|midterm|final)\b/.test(t)) return "test";
  if (/\b(hw|homework|due|submit|turn in|project|essay|lab report)\b/.test(t)) return "assignment";
  return "other";
}

function parseICal(text: string): CalEvent[] {
  const events: CalEvent[] = [];
  // Split into VEVENT blocks
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  for (const block of blocks) {
    const end = block.indexOf("END:VEVENT");
    const content = end >= 0 ? block.slice(0, end) : block;
    // Unfold lines (RFC 5545: continuation lines start with space or tab)
    const unfolded = content.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
    const lines = unfolded.split(/\r?\n/).filter(l => l.trim());

    const get = (key: string): string => {
      const re = new RegExp(`^${key}[;:][^\r\n]*`, "im");
      const m = unfolded.match(re);
      if (!m) return "";
      return unescape(m[0].replace(new RegExp(`^${key}[^:]*:`, "i"), "").trim());
    };

    const uid   = get("UID") || Math.random().toString(36).slice(2);
    const title = get("SUMMARY");
    const url   = get("URL");
    const dtstart = lines.find(l => /^DTSTART/i.test(l))?.replace(/^DTSTART[^:]*:/i, "") ?? "";
    const dtend   = lines.find(l => /^DTEND/i.test(l))?.replace(/^DTEND[^:]*:/i, "")   ?? "";

    if (!title || !dtstart) continue;

    const allDay = dtstart.length === 8 || /VALUE=DATE/i.test(
      lines.find(l => /^DTSTART/i.test(l)) ?? ""
    );

    events.push({
      uid,
      title,
      description: url,   // store the Schoology link for "Open in Schoology"
      start: parseICalDate(dtstart),
      end: dtend ? parseICalDate(dtend) : parseICalDate(dtstart),
      allDay,
      course: "",          // Schoology iCal does not include course names
      type: detectType(title, url),
    });
  }
  return events;
}

export async function POST(request: NextRequest) {
  const { icalUrl } = await request.json();
  if (!icalUrl || typeof icalUrl !== "string") {
    return NextResponse.json({ error: "Missing icalUrl" }, { status: 400 });
  }
  // Convert webcal:// → https:// and validate domain
  let fetchUrl = icalUrl.replace(/^webcal:\/\//i, "https://");
  try {
    const parsed = new URL(fetchUrl);
    const ok = ["schoology.com", "fcps.edu", "lms.fcps.edu"].some(d =>
      parsed.hostname === d || parsed.hostname.endsWith("." + d)
    );
    if (!ok) {
      return NextResponse.json({ error: "Only Schoology or FCPS calendar URLs are supported." }, { status: 400 });
    }
    fetchUrl = parsed.toString();
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  try {
    const res = await fetch(fetchUrl, {
      headers: { "User-Agent": "UpGrade/1.0 (FCPS grade viewer)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Schoology returned ${res.status}. Check your calendar URL.` }, { status: 502 });
    }
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      return NextResponse.json({ error: "URL does not appear to be a valid iCal feed." }, { status: 400 });
    }
    const events = parseICal(text);
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to fetch calendar.",
    }, { status: 500 });
  }
}
