import { type NextRequest, NextResponse } from "next/server";

// No auth required — pass all requests through
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
