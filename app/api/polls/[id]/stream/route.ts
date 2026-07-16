import { NextRequest } from "next/server";
import { getPoll, subscribe, subscribeToDeletion, Poll } from "@/lib/store";

export const dynamic = "force-dynamic";

function toSSE(event: string, data?: Poll) {
  return data
    ? `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    : `event: ${event}\ndata: {}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) {
    return new Response("Poll not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};
  let unsubscribeDeletion: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(toSSE("poll", poll)));

      unsubscribe = subscribe(id, (updated) => {
        controller.enqueue(encoder.encode(toSSE("poll", updated)));
      });

      unsubscribeDeletion = subscribeToDeletion(id, () => {
        controller.enqueue(encoder.encode(toSSE("deleted")));
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      });

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        unsubscribeDeletion();
        controller.close();
      });
    },
    cancel() {
      unsubscribe();
      unsubscribeDeletion();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
