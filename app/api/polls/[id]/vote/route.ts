import { NextRequest, NextResponse } from "next/server";
import { vote } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const optionId = typeof body?.optionId === "string" ? body.optionId : "";
  const respondentId = typeof body?.respondentId === "string" ? body.respondentId : "";

  if (!optionId) {
    return NextResponse.json({ error: "optionId is required" }, { status: 400 });
  }
  if (!respondentId) {
    return NextResponse.json({ error: "respondentId is required" }, { status: 400 });
  }

  const poll = await vote(id, optionId, respondentId);
  if (!poll) {
    return NextResponse.json({ error: "Poll or option not found" }, { status: 404 });
  }

  return NextResponse.json({ poll });
}
