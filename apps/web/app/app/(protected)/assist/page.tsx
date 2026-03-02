"use client";

import { Card } from "@chief/ui/web";
import { useState } from "react";

interface AssistReference {
  type: string;
  id: string;
  title: string;
}

interface AssistResult {
  intent: string;
  answer: string;
  references: AssistReference[];
}

const prompts = [
  "What am I waiting on?",
  "What is at risk?",
  "Summarize today.",
  "Prepare me for my next meeting.",
  "Show pending decisions."
];

export default function AssistPage() {
  const [query, setQuery] = useState(prompts[2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistResult | null>(null);

  async function runAssist(nextQuery?: string) {
    const prompt = (nextQuery ?? query).trim();
    if (!prompt) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: prompt })
      });
      const payload = (await response.json()) as AssistResult | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error((payload as { error?: { message?: string } }).error?.message ?? "Unable to run assist.");
      }
      setResult(payload as AssistResult);
      setQuery(prompt);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to run assist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[30px] font-semibold">Chief Assist</h1>
        <p className="text-[13px] text-textSecondary">Command layer grounded in local structured records.</p>
      </div>

      <Card className="border border-black/10 p-4 shadow-none">
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void runAssist(prompt)}
              className="h-8 rounded-pill bg-chipBg px-3 text-[11px] text-textSecondary"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
            placeholder="Ask a structured question"
          />
          <button
            type="button"
            onClick={() => void runAssist()}
            disabled={loading}
            className="h-11 rounded-[10px] bg-[#111418] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            {loading ? "Running..." : "Run"}
          </button>
        </div>
      </Card>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="mb-2 text-[16px] font-semibold">Response</p>
        {!result ? <p className="text-[13px] text-textSecondary">No result yet.</p> : null}
        {result ? (
          <div className="space-y-3">
            <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-textSecondary">Intent</p>
              <p className="text-[13px] font-semibold text-textPrimary">{result.intent}</p>
            </div>
            <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textPrimary">
              {result.answer}
            </div>
            <div>
              <p className="mb-2 text-[12px] uppercase tracking-[0.08em] text-textSecondary">References</p>
              <div className="space-y-2">
                {result.references.map((reference) => (
                  <div key={`${reference.type}-${reference.id}`} className="rounded-[10px] border border-black/10 bg-white px-3 py-2">
                    <p className="text-[12px] font-semibold text-textPrimary">{reference.title}</p>
                    <p className="text-[11px] text-textSecondary">{reference.type} • {reference.id}</p>
                  </div>
                ))}
                {result.references.length === 0 ? (
                  <p className="text-[12px] text-textSecondary">No references returned.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
