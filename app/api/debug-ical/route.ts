import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { icalUrl } = await request.json();
  let fetchUrl = icalUrl.replace(/^webcal:\/\//i, "https://");
  const res = await fetch(fetchUrl, { headers: { "User-Agent": "UpGrade/1.0" } });
  const text = await res.text();

  // Parse first 3 VEVENTs and return their raw fields
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1, 4);
  const parsed = blocks.map(block => {
    const end = block.indexOf("END:VEVENT");
    const content = end >= 0 ? block.slice(0, end) : block;
    const unfolded = content.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
    const lines = unfolded.split(/\r?\n/).filter(l => l.trim());
    const fields: Record<string, string> = {};
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).replace(/;.*/, "");
        fields[key] = line.slice(idx + 1);
      }
    }
    return fields;
  });

  return NextResponse.json({ raw: text.slice(0, 500), events: parsed });
}
