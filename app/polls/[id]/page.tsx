"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  createdAt: string;
  options: { id: string; text: string; votes: number }[];
};

type FormOption = { id?: string; text: string };

export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<FormOption[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<"respond" | "results" | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/polls/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Poll not found");
        setPoll(data.poll);
        setFormQuestion(data.poll.question);
        setFormOptions(data.poll.options.map((o: Poll["options"][number]) => ({ id: o.id, text: o.text })));
      })
      .catch((err) => setLoadError(err.message));

    const source = new EventSource(`/api/polls/${id}/stream`);
    source.addEventListener("poll", (event) => setPoll(JSON.parse(event.data)));
    source.addEventListener("deleted", () => {
      setDeleted(true);
      source.close();
    });

    return () => source.close();
  }, [id]);

  const totalVotes = poll ? poll.options.reduce((sum, o) => sum + o.votes, 0) : 0;
  const votesByOptionId = new Map(poll?.options.map((o) => [o.id, o.votes]) ?? []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const respondUrl = `${origin}/poll/${id}`;
  const resultsUrl = `${origin}/poll/${id}/results`;

  function updateOption(index: number, value: string) {
    setFormOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text: value } : o)));
  }

  function addOption() {
    setFormOptions((prev) => [...prev, { text: "" }]);
  }

  function removeOption(index: number) {
    setFormOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const cleanOptions = formOptions
      .map((o) => ({ ...o, text: o.text.trim() }))
      .filter((o) => o.text);

    if (!formQuestion.trim()) {
      setError("Please enter a question.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Please enter at least 2 options.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/polls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: formQuestion.trim(), options: cleanOptions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save poll");
      setPoll(data.poll);
      setFormQuestion(data.poll.question);
      setFormOptions(data.poll.options.map((o: Poll["options"][number]) => ({ id: o.id, text: o.text })));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save poll");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this poll? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/polls/${id}`, { method: "DELETE" });
      router.push("/");
    } catch {
      setDeleting(false);
    }
  }

  function copyLink(kind: "respond" | "results") {
    navigator.clipboard.writeText(kind === "respond" ? respondUrl : resultsUrl).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (deleted) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-center">
        <p className="text-zinc-700">This poll has been deleted.</p>
        <Link
          href="/"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 font-medium text-white hover:bg-zinc-800"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between border-b border-black/[.08] bg-white px-6 py-4">
        <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-black">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-semibold text-black">Poll detail</h1>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete poll"}
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {loadError && <p className="text-red-600">{loadError}</p>}

        {poll && (
          <>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/[.08] bg-white px-6 py-4 shadow-sm">
              <p className="text-zinc-700">
                <span className="text-2xl font-semibold text-black">{totalVotes}</span>{" "}
                response{totalVotes === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-zinc-500">
                Created {new Date(poll.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-medium text-black">Share this poll</h2>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    readOnly
                    value={respondUrl}
                    className="w-full truncate rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm text-zinc-700"
                  />
                  <button
                    onClick={() => copyLink("respond")}
                    className="shrink-0 rounded-lg border border-black/[.12] px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-black/[.04]"
                  >
                    {copied === "respond" ? "Copied!" : "Copy respond link"}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    readOnly
                    value={resultsUrl}
                    className="w-full truncate rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm text-zinc-700"
                  />
                  <button
                    onClick={() => copyLink("results")}
                    className="shrink-0 rounded-lg border border-black/[.12] px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-black/[.04]"
                  >
                    {copied === "results" ? "Copied!" : "Copy live results link"}
                  </button>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="mt-6 flex flex-col gap-5 rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm"
            >
              <h2 className="text-sm font-medium text-black">Edit poll</h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Question</label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-black outline-none focus:border-black/40"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Options</label>
                <div className="flex flex-col gap-2">
                  {formOptions.map((option, index) => (
                    <div key={option.id ?? `new-${index}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-black outline-none focus:border-black/40"
                      />
                      <span className="w-20 shrink-0 text-right text-sm text-zinc-500">
                        {option.id ? `${votesByOptionId.get(option.id) ?? 0} votes` : "new"}
                      </span>
                      {formOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="shrink-0 rounded-lg border border-black/[.12] px-3 py-2 text-sm text-zinc-600 hover:bg-black/[.04]"
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
                  className="mt-2 text-sm font-medium text-zinc-600 hover:text-black"
                >
                  + Add option
                </button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="flex h-11 w-full items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
