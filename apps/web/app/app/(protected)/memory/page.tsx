"use client";

import { Card } from "@chief/ui/web";
import Link from "next/link";
import { useState } from "react";

interface MemoryResult {
  type: "summary" | "task" | "meeting" | "decision";
  id: string;
  title: string;
  excerpt: string;
  href: string;
}

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MemoryResult[]>([]);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/memory/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json()) as { results?: MemoryResult[]; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to search memory.");
      }
      setResults(payload.results ?? []);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to search memory.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[30px] font-semibold">Memory</h1>
        <p className="text-[13px] text-textSecondary">Search summaries, tasks, meetings, and decisions.</p>
      </div>

      <Card className="border border-black/10 p-4 shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search memory"
            className="h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[13px] text-textPrimary"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={loading}
            className="h-11 rounded-[10px] bg-[#111418] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </Card>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="mb-3 text-[16px] font-semibold">Results</p>
        <div className="space-y-2">
          {results.map((result) => (
            <div key={result.id} className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-textSecondary">
                <span className="rounded-pill bg-chipBg px-2 py-1">{result.type}</span>
              </div>
              <p className="text-[14px] font-semibold text-textPrimary">{result.title}</p>
              <p className="mt-1 text-[12px] text-textSecondary">{result.excerpt}</p>
              <Link href={result.href.startsWith("/app") ? result.href : `/app${result.href}`} className="mt-2 inline-block text-[12px] font-medium text-[#175CD3]">
                Open
              </Link>
            </div>
          ))}
          {results.length === 0 ? (
            <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
              No results yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
