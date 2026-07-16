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
    <div className="flex flex-1 items-center justify-center bg-zinc-950 px-4 py-16">
      <main className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-sm">
        {loading && <p className="text-zinc-400">Loading…</p>}

        {!loading && error && !poll && <p className="text-red-400">{error}</p>}

        {poll && (
          <>
            <h1 className="text-2xl font-semibold text-zinc-50">{poll.question}</h1>

            {hasResponded ? (
              <p className="mt-6 text-zinc-300">Thanks — your response has been recorded.</p>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {poll.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      selectedOptionId === option.id
                        ? "border-white bg-white/10"
                        : "border-white/15 hover:bg-white/5"
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
                    <span className="text-zinc-50">{option.text}</span>
                  </label>
                ))}

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  onClick={handleVote}
                  disabled={!selectedOptionId || submitting}
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-zinc-50 px-5 font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
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
