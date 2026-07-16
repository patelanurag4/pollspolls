"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Please enter at least 2 options.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), options: cleanOptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }
      router.push(`/poll/${data.poll.id}/results`);
    } catch {
      setError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-lg rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Create a poll
          </h1>
          <Link
            href="/polls"
            className="text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            All polls →
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Get a shareable link people can use to vote, and watch results update live.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-zinc-50">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we order for lunch?"
              className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-black outline-none focus:border-black/40 dark:border-white/[.16] dark:text-zinc-50 dark:focus:border-white/40"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-zinc-50">
              Options
            </label>
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-black outline-none focus:border-black/40 dark:border-white/[.16] dark:text-zinc-50 dark:focus:border-white/40"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="shrink-0 rounded-lg border border-black/[.12] px-3 py-2 text-sm text-zinc-600 hover:bg-black/[.04] dark:border-white/[.16] dark:text-zinc-400 dark:hover:bg-white/[.06]"
                      aria-label={`Remove option ${index + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              + Add option
            </button>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {submitting ? "Creating…" : "Create poll"}
          </button>
        </form>
      </main>
    </div>
  );
}
