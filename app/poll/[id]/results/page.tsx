"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
};

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const voteUrl = poll ? `${window.location.origin}/poll/${poll.id}` : "";
  const totalVotes = poll ? poll.options.reduce((sum, o) => sum + o.votes, 0) : 0;

  function copyLink() {
    navigator.clipboard.writeText(voteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleDelete() {
    if (!poll) return;
    if (!confirm("Delete this poll? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/polls/${poll.id}`, { method: "DELETE" });
      router.push("/polls");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-lg rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-900">
        {deleted && (
          <div>
            <p className="text-zinc-700 dark:text-zinc-300">This poll has been deleted.</p>
            <Link
              href="/polls"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              View all polls
            </Link>
          </div>
        )}

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
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {connected ? "● live" : "connecting…"}
              </span>
            </div>

            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {totalVotes} vote{totalVotes === 1 ? "" : "s"}
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
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {option.votes} ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-black/[.08] pt-4 dark:border-white/[.145]">
              <p className="mb-2 text-sm font-medium text-black dark:text-zinc-50">
                Share this poll
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={voteUrl}
                  className="w-full truncate rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm text-zinc-700 dark:border-white/[.16] dark:text-zinc-300"
                />
                <button
                  onClick={copyLink}
                  className="shrink-0 rounded-lg border border-black/[.12] px-3 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href="/polls"
                  className="text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  ← All polls
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                >
                  {deleting ? "Deleting…" : "Delete poll"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
