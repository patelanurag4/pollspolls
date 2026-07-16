import { NextRequest, NextResponse } from "next/server";
import { deletePoll, getPoll, updatePoll } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  return NextResponse.json({ poll });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const options: { id?: string; text: string }[] = Array.isArray(body?.options)
    ? body.options
        .map((o: unknown) => {
          if (typeof o === "string") return { text: o.trim() };
          if (o && typeof o === "object" && typeof (o as { text?: unknown }).text === "string") {
            const opt = o as { id?: unknown; text: string };
            return { id: typeof opt.id === "string" ? opt.id : undefined, text: opt.text.trim() };
          }
          return null;
        })
        .filter((o: { id?: string; text: string } | null): o is { id?: string; text: string } => !!o && !!o.text)
    : [];

  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  if (options.length < 2) {
    return NextResponse.json({ error: "At least 2 options are required" }, { status: 400 });
  }

  const poll = await updatePoll(id, question, options);
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  return NextResponse.json({ poll });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existed = await deletePoll(id);
  if (!existed) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
