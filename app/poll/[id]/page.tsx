"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
};

const RESPONDENT_KEY = "pollapp-respondent-id";

function getRespondentId(): string {
  let respondentId = localStorage.getItem(RESPONDENT_KEY);
  if (!respondentId) {
    respondentId = crypto.randomUUID();
    localStorage.setItem(RESPONDENT_KEY, respondentId);
  }
  return respondentId;
}

export default function VotePage() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    () => (typeof window !== "undefined" && localStorage.getItem(`poll-vote-${id}`)) || null
  );
  const [submitting, setSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(
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
        body: JSON.stringify({ optionId: selectedOptionId, respondentId: getRespondentId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit response");
      localStorage.setItem(`poll-vote-${poll.id}`, selectedOptionId);
      setHasResponded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10 sm:py-16">
      <main className="w-full max-w-lg rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm sm:p-8 lg:w-[60%] lg:max-w-2xl">
        {loading && <p className="text-zinc-600">Loading…</p>}

        {!loading && error && !poll && <p className="text-red-600">{error}</p>}

        {poll && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Poll</p>
            <h1 className="mt-2 text-2xl font-bold leading-snug text-black sm:text-3xl">
              {poll.question}
            </h1>

            {hasResponded ? (
              <div className="mt-8 flex flex-col items-center gap-3 py-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-xl text-white">
                  ✓
                </span>
                <p className="text-lg font-medium text-zinc-800">
                  Thanks — your response has been recorded.
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {poll.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base transition-colors sm:text-lg ${
                      selectedOptionId === option.id
                        ? "border-black bg-black/[.04] ring-1 ring-black"
                        : "border-black/[.12] active:bg-black/[.04] sm:hover:bg-black/[.02]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={option.id}
                      checked={selectedOptionId === option.id}
                      onChange={() => setSelectedOptionId(option.id)}
                      className="h-5 w-5 shrink-0 accent-black"
                    />
                    <span className="text-black">{option.text}</span>
                  </label>
                ))}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={handleVote}
                  disabled={!selectedOptionId || submitting}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit response"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
