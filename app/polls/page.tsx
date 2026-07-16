"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  createdAt: string;
};

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadPolls() {
    fetch("/api/polls")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load polls");
        setPolls(data.polls);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadPolls();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this poll? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/polls/${id}`, { method: "DELETE" });
      setPolls((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-2xl rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">All polls</h1>
          <Link
            href="/"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            + New poll
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {polls && polls.length === 0 && (
          <p className="mt-6 text-zinc-600 dark:text-zinc-400">
            No polls yet.{" "}
            <Link href="/" className="font-medium text-black underline dark:text-zinc-50">
              Create one
            </Link>
            .
          </p>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {polls?.map((poll) => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
            return (
              <li
                key={poll.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-black dark:text-zinc-50">
                    {poll.question}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {totalVotes} vote{totalVotes === 1 ? "" : "s"} · {poll.options.length} options
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm font-medium">
                  <Link
                    href={`/poll/${poll.id}/results`}
                    className="text-black hover:underline dark:text-zinc-50"
                  >
                    Results
                  </Link>
                  <Link
                    href={`/poll/${poll.id}`}
                    className="text-black hover:underline dark:text-zinc-50"
                  >
                    Vote
                  </Link>
                  <button
                    onClick={() => handleDelete(poll.id)}
                    disabled={deletingId === poll.id}
                    className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    {deletingId === poll.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
