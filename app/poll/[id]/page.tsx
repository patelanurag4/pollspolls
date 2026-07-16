"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
};

export default function VotePage() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem(`poll-vote-${id}`))
  );

  useEffect(() => {
    if (!id) return;

    fetch(`/api/polls/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Poll not found");
        setPoll(data.poll);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleVote() {
    if (!selectedOptionId || !poll) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: selectedOptionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit vote");
      localStorage.setItem(`poll-vote-${poll.id}`, selectedOptionId);
      setVoted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit vote");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-lg rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-900">
        {loading && <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}

        {!loading && error && !poll && (
          <p className="text-red-600 dark:text-red-400">{error}</p>
        )}

        {poll && (
          <>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              {poll.question}
            </h1>

            {voted ? (
              <div className="mt-6">
                <p className="text-zinc-700 dark:text-zinc-300">
                  Thanks for voting! Check out the live results.
                </p>
                <Link
                  href={`/poll/${poll.id}/results`}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                >
                  View live results
                </Link>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {poll.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      selectedOptionId === option.id
                        ? "border-black bg-black/[.04] dark:border-white dark:bg-white/[.08]"
                        : "border-black/[.12] hover:bg-black/[.02] dark:border-white/[.16] dark:hover:bg-white/[.04]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={option.id}
                      checked={selectedOptionId === option.id}
                      onChange={() => setSelectedOptionId(option.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-black dark:text-zinc-50">{option.text}</span>
                  </label>
                ))}

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <button
                  onClick={handleVote}
                  disabled={!selectedOptionId || submitting}
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  {submitting ? "Submitting…" : "Submit vote"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
