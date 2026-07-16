import { NextRequest, NextResponse } from "next/server";
import { createPoll, listPolls } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ polls: listPolls() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const options: string[] = Array.isArray(body?.options)
    ? body.options.map((o: unknown) => (typeof o === "string" ? o.trim() : "")).filter(Boolean)
    : [];

  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  if (options.length < 2) {
    return NextResponse.json({ error: "At least 2 options are required" }, { status: 400 });
  }

  const poll = createPoll(question, options);
  return NextResponse.json({ poll }, { status: 201 });
}
