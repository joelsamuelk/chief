"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

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

interface AssistMessage {
  role: "user" | "assistant";
  text: string;
  references?: AssistReference[];
}

const prompts = [
  "What am I waiting on?",
  "What is at risk?",
  "Summarize today.",
  "Prepare me for my next meeting.",
  "Show pending decisions."
];

function sectionFromPath(pathname: string) {
  if (pathname.includes("/tasks")) return "tasks";
  if (pathname.includes("/decisions")) return "decisions";
  if (pathname.includes("/meetings")) return "meetings";
  if (pathname.includes("/team")) return "team";
  if (pathname.includes("/queue")) return "queue";
  if (pathname.includes("/execution")) return "execution";
  if (pathname.includes("/memory")) return "memory";
  if (pathname.includes("/today")) return "today";
  if (pathname.includes("/settings")) return "settings";
  return "workspace";
}

export function FloatingAssist() {
  const pathname = usePathname() ?? "/";
  const assistEnabledPrefixes = [
    "/app/today",
    "/app/tasks",
    "/app/decisions",
    "/app/meetings",
    "/app/team",
    "/app/queue",
    "/app/execution",
    "/app/memory"
  ];

  const isProtectedAppRoute = assistEnabledPrefixes.some((prefix) => pathname.startsWith(prefix));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistMessage[]>([]);

  const section = useMemo(() => sectionFromPath(pathname), [pathname]);

  if (!isProtectedAppRoute) {
    return null;
  }

  async function runAssist(nextQuery?: string) {
    const prompt = (nextQuery ?? query).trim();
    if (!prompt) return;

    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);

    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: prompt,
          app_context: {
            path: pathname,
            section
          }
        })
      });

      const payload = (await response.json()) as AssistResult | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error((payload as { error?: { message?: string } }).error?.message ?? "Unable to run assist.");
      }

      const result = payload as AssistResult;
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer, references: result.references }]);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to run assist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-[70] inline-flex h-12 items-center gap-2 rounded-full bg-chipActiveBg px-4 text-[13px] font-semibold text-chipActiveText shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
      >
        ✦ Chief Assist
      </button>

      {open ? (
        <div className="fixed bottom-20 right-5 z-[70] w-[360px] max-w-[calc(100vw-1.5rem)] rounded-[18px] border border-black/10 bg-white p-3 shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-textPrimary">Chief Assist</p>
              <p className="text-[11px] text-textSecondary">Context: {section}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full bg-chipBg text-[13px] text-textSecondary"
            >
              ×
            </button>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void runAssist(prompt)}
                disabled={loading}
                className="h-7 rounded-pill bg-chipBg px-2.5 text-[10px] font-medium text-textSecondary disabled:opacity-70"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="max-h-[260px] space-y-2 overflow-y-auto rounded-[12px] border border-black/10 bg-[#FAFAFB] p-2">
            {messages.length === 0 ? (
              <p className="text-[12px] text-textSecondary">Ask anything about your workspace. Chief Assist will use your current page context.</p>
            ) : null}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-[10px] px-2.5 py-2 text-[12px] ${
                  message.role === "user" ? "bg-chipBg text-textPrimary" : "bg-white text-textPrimary"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.role === "assistant" && message.references && message.references.length > 0 ? (
                  <p className="mt-1 text-[10px] text-textSecondary">References: {message.references.length}</p>
                ) : null}
              </div>
            ))}
          </div>

          {error ? <p className="mt-2 text-[11px] font-medium text-[#b42318]">{error}</p> : null}

          <div className="mt-2 flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runAssist();
                }
              }}
              placeholder="Ask Chief Assist"
              className="h-10 flex-1 rounded-[10px] border border-black/10 bg-white px-3 text-[12px]"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void runAssist()}
              className="h-10 rounded-[10px] bg-chipActiveBg px-3 text-[12px] font-semibold text-chipActiveText disabled:opacity-70"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
