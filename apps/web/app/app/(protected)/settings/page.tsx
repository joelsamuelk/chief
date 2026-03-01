"use client";

import { Card } from "@chief/ui/web";
import { useEffect, useState } from "react";
import type { ProactivityLevel } from "@/lib/storage";

interface DigestRecord {
  id: string;
  kind: "morning" | "eod";
  created_at: string;
  content: Record<string, unknown>;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sharedText, setSharedText] = useState("");
  const [digests, setDigests] = useState<DigestRecord[]>([]);
  const [proactivity, setProactivity] = useState<ProactivityLevel>("quiet");

  async function loadDigests() {
    try {
      const response = await fetch("/api/notifications/plan", { method: "GET", cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        plan?: { proactivity_level?: ProactivityLevel };
        digests?: DigestRecord[];
      };
      setDigests(payload.digests ?? []);
      if (payload.plan?.proactivity_level) {
        setProactivity(payload.plan.proactivity_level);
      }
    } catch {
      setDigests([]);
    }
  }

  useEffect(() => {
    void loadDigests();
  }, []);

  async function runAction(action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/local-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Action failed.");
      }

      if (action === "export") {
        const exportResponse = await fetch("/api/account/export", { method: "GET", cache: "no-store" });
        const exportPayload = (await exportResponse.json()) as Record<string, unknown>;
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `chief-local-export-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      }

      if (action === "create_shared_text") {
        setSharedText("");
      }

      setMessage("Done.");
      await loadDigests();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Action failed.");
    } finally {
      setLoading(false);
    }
  }

  async function updateProactivity(level: ProactivityLevel) {
    setProactivity(level);
    await runAction("set_proactivity", { proactivity_level: level });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[30px] font-semibold">Settings</h1>
        <p className="text-[13px] text-textSecondary">Local mode controls and executive notification preferences.</p>
      </div>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}
      {message ? <p className="text-[13px] font-medium text-[#106C2A]">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border border-black/10 p-4 shadow-none">
          <p className="mb-3 text-[16px] font-semibold">Ingestion simulation</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runAction("import_emails")}
              disabled={loading}
              className="h-9 rounded-pill bg-chipBg px-3 text-[12px] text-textSecondary disabled:opacity-70"
            >
              Import sample emails
            </button>
            <button
              type="button"
              onClick={() => void runAction("import_meetings")}
              disabled={loading}
              className="h-9 rounded-pill bg-chipBg px-3 text-[12px] text-textSecondary disabled:opacity-70"
            >
              Import sample meetings
            </button>
          </div>

          <div className="mt-3">
            <textarea
              value={sharedText}
              onChange={(event) => setSharedText(event.target.value)}
              placeholder="Paste shared text"
              className="min-h-24 w-full rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[13px]"
            />
            <button
              type="button"
              onClick={() => void runAction("create_shared_text", { raw_content: sharedText })}
              disabled={loading || sharedText.trim().length === 0}
              className="mt-2 h-9 rounded-[10px] bg-[#111418] px-3 text-[12px] font-semibold text-white disabled:opacity-70"
            >
              Create shared text source
            </button>
          </div>
        </Card>

        <Card className="border border-black/10 p-4 shadow-none">
          <p className="mb-3 text-[16px] font-semibold">Notifications</p>
          <p className="mb-2 text-[12px] text-textSecondary">Proactivity level</p>
          <div className="flex flex-wrap gap-2">
            {(["reactive", "quiet", "strong"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => void updateProactivity(level)}
                disabled={loading}
                className={`h-9 rounded-pill px-3 text-[12px] ${
                  proactivity === level ? "bg-chipActiveBg text-chipActiveText" : "bg-chipBg text-textSecondary"
                } disabled:opacity-70`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runAction("morning_digest")}
              disabled={loading}
              className="h-9 rounded-pill border border-black/10 bg-white px-3 text-[12px] text-textSecondary disabled:opacity-70"
            >
              Generate morning brief
            </button>
            <button
              type="button"
              onClick={() => void runAction("eod_digest")}
              disabled={loading}
              className="h-9 rounded-pill border border-black/10 bg-white px-3 text-[12px] text-textSecondary disabled:opacity-70"
            >
              Generate EOD recap
            </button>
          </div>
        </Card>
      </div>

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="mb-3 text-[16px] font-semibold">Data tools</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAction("seed")}
            disabled={loading}
            className="h-9 rounded-pill bg-chipBg px-3 text-[12px] text-textSecondary disabled:opacity-70"
          >
            Seed sample data
          </button>
          <button
            type="button"
            onClick={() => void runAction("reset")}
            disabled={loading}
            className="h-9 rounded-pill bg-[#FBE9EA] px-3 text-[12px] text-[#A12A32] disabled:opacity-70"
          >
            Reset local data
          </button>
          <button
            type="button"
            onClick={() => void runAction("export")}
            disabled={loading}
            className="h-9 rounded-pill border border-black/10 bg-white px-3 text-[12px] text-textSecondary disabled:opacity-70"
          >
            Export local JSON
          </button>
        </div>
      </Card>

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="mb-3 text-[16px] font-semibold">Digests</p>
        <div className="space-y-2">
          {digests.map((digest) => (
            <div key={digest.id} className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
              <p className="text-[13px] font-semibold text-textPrimary">{digest.kind.toUpperCase()}</p>
              <p className="text-[11px] text-textSecondary">{new Date(digest.created_at).toLocaleString()}</p>
            </div>
          ))}
          {digests.length === 0 ? (
            <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
              No digest records yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
