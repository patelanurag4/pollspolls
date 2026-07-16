import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/auth";

function isPublicApiRequest(segments: string[], method: string): boolean {
  // /api/polls/[id]            GET  -> read a single poll (used by public respond/results pages)
  // /api/polls/[id]/vote       POST -> submit/resubmit a response
  // /api/polls/[id]/stream     GET  -> live SSE results feed
  if (segments.length === 3 && method === "GET") return true;
  if (segments.length === 4 && segments[3] === "vote") return true;
  if (segments.length === 4 && segments[3] === "stream") return true;
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthed = req.cookies.get(SESSION_COOKIE)?.value === SESSION_TOKEN;

  if (isAuthed) return NextResponse.next();

  if (pathname.startsWith("/api/polls")) {
    const segments = pathname.split("/").filter(Boolean); // ["api", "polls", ...]
    if (isPublicApiRequest(segments, req.method)) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/polls/:path*", "/api/polls/:path*"],
};
