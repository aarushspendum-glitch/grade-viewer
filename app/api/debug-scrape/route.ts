import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { districtUrl } = await request.json();
  const base = districtUrl.replace(/\/$/, "");

  const urls = [
    `${base}/PXP2_Login.aspx`,
    `${base}/Login.aspx`,
    `${base}/`,
  ];

  const results: Record<string, unknown> = {};

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,*/*",
        },
        redirect: "follow",
      });
      const html = await res.text();

      // Extract all input names and their types
      const inputs = [...html.matchAll(/<input[^>]*>/gi)].map(m => {
        const tag = m[0];
        const name = tag.match(/name="([^"]*)"/i)?.[1] ?? "";
        const type = tag.match(/type="([^"]*)"/i)?.[1] ?? "text";
        const id = tag.match(/\bid="([^"]*)"/i)?.[1] ?? "";
        return { name, type, id };
      }).filter(i => i.name);

      results[url] = {
        status: res.status,
        finalUrl: res.url,
        inputs,
        htmlSnippet: html.slice(0, 2000),
      };
    } catch (e) {
      results[url] = { error: e instanceof Error ? e.message : "failed" };
    }
  }

  return NextResponse.json(results);
}
