"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
};

// Validated categorical palette (fixed hue order — never cycled). Beyond 8
// options, overflow falls back to a neutral gray rather than reusing a hue.
const BAR_COLORS = [
  "#2a78d6", // blue
  "#008300", // green
  "#e87ba4", // magenta
  "#eda100", // yellow
  "#1baf7a", // aqua
  "#eb6834", // orange
  "#4a3aa7", // violet
  "#e34948", // red
];
const OVERFLOW_COLOR = "#898781";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!id) return;

    const source = new EventSource(`/api/polls/${id}/stream`);

    source.addEventListener("open", () => setConnected(true));
    source.addEventListener("error", () => setConnected(false));
    source.addEventListener("poll", (event) => {
      setPoll(JSON.parse(event.data));
      setError("");
    });
    source.addEventListener("deleted", () => {
      setDeleted(true);
      source.close();
    });

    fetch(`/api/polls/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Poll not found");
      })
      .catch((err) => setError(err.message));

    return () => source.close();
  }, [id]);

  const totalVotes = poll ? poll.options.reduce((sum, o) => sum + o.votes, 0) : 0;

  return (
    <div className="flex flex-1 items-center justify-center bg-transparent px-4 py-10">
      <main className="w-[80%] max-w-5xl">
        {deleted && <p className="text-lg text-black">This poll has been deleted.</p>}

        {!deleted && error && !poll && <p className="text-lg text-red-600">{error}</p>}

        {!deleted && poll && (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold text-black sm:text-4xl">{poll.question}</h1>
              <span
                className={`mt-2 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  connected ? "bg-green-100 text-green-800" : "bg-zinc-200 text-black"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {connected && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      connected ? "bg-green-600" : "bg-zinc-500"
                    }`}
                  />
                </span>
                {connected ? "Live" : "Connecting…"}
              </span>
            </div>

            <p className="mt-2 text-lg font-medium text-black">
              {totalVotes} response{totalVotes === 1 ? "" : "s"}
            </p>

            <div className="mt-8 flex flex-col gap-6">
              {poll.options.map((option, index) => {
                const pct = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                const color = BAR_COLORS[index] ?? OVERFLOW_COLOR;
                return (
                  <div key={option.id}>
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <span className="text-xl font-semibold text-black">{option.text}</span>
                      <span className="shrink-0 text-lg font-medium text-black">
                        {option.votes} · {pct}%
                      </span>
                    </div>
                    <div className="h-6 w-full overflow-hidden rounded-r-full bg-black/[.06]">
                      <div
                        className="h-full rounded-r-full transition-all duration-500 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
