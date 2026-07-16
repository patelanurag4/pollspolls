"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
};

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
    <div className="flex flex-1 items-center justify-center bg-transparent px-4 py-8">
      <main className="w-full max-w-lg p-8">
        {deleted && <p className="text-zinc-900 dark:text-zinc-300">This poll has been deleted.</p>}

        {!deleted && error && !poll && <p className="text-red-600 dark:text-red-400">{error}</p>}

        {!deleted && poll && (
          <>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
                {poll.question}
              </h1>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                  connected
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {connected ? "● live" : "connecting…"}
              </span>
            </div>

            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-400">
              {totalVotes} response{totalVotes === 1 ? "" : "s"}
            </p>

            <div className="mt-6 flex flex-col gap-4">
              {poll.options.map((option) => {
                const pct = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                return (
                  <div key={option.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-black dark:text-zinc-50">
                        {option.text}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-400">
                        {option.votes} ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                      <div
                        className="h-full rounded-full bg-black dark:bg-white transition-all duration-300"
                        style={{ width: `${pct}%` }}
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
