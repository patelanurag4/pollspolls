"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  createdAt: string;
  options: { id: string; text: string; votes: number }[];
};

export default function Dashboard() {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

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

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleCreated(poll: Poll) {
    setPolls((prev) => (prev ? [poll, ...prev] : [poll]));
    setModalOpen(false);
  }

  return (
    <div className="min-h-screen flex-1 bg-zinc-950">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-50">PollApp</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            + New poll
          </button>
          <button
            onClick={handleLogout}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {polls && polls.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="text-zinc-400">No polls yet.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
            >
              Create your first poll
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls?.map((poll) => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
            return (
              <button
                key={poll.id}
                onClick={() => router.push(`/polls/${poll.id}`)}
                className="flex flex-col items-start rounded-2xl border border-white/10 bg-zinc-900 p-5 text-left transition-colors hover:border-white/25"
              >
                <p className="line-clamp-2 font-medium text-zinc-50">{poll.question}</p>
                <p className="mt-2 text-sm text-zinc-400">
                  {totalVotes} response{totalVotes === 1 ? "" : "s"} · {poll.options.length} options
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(poll.createdAt).toLocaleDateString()}
                </p>
              </button>
            );
          })}
        </div>
      </main>

      {modalOpen && (
        <NewPollModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}

function NewPollModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (poll: Poll) => void;
}) {
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
      onCreated(data.poll);
    } catch {
      setError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-50">New poll</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-50">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we order for lunch?"
              autoFocus
              className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-zinc-50 outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-50">Options</label>
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-zinc-50 outline-none focus:border-white/40"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5"
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
              className="mt-2 text-sm font-medium text-zinc-400 hover:text-zinc-50"
            >
              + Add option
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-zinc-50 px-5 font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create poll"}
          </button>
        </form>
      </div>
    </div>
  );
}
