"use client";

import { Card } from "@chief/ui/web";
import { useEffect, useMemo, useState } from "react";

type DecisionStatus = "proposed" | "approved" | "implemented";

interface Decision {
  id: string;
  title: string;
  context: string | null;
  owner: string | null;
  status: DecisionStatus;
  related_meeting_id: string | null;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [owner, setOwner] = useState("");

  async function loadDecisions() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/decisions", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { decisions?: Decision[]; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to load decisions.");
      }
      setDecisions(payload.decisions ?? []);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to load decisions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDecisions();
  }, []);

  async function createDecision() {
    if (!title.trim()) return;
    setSaving("create");
    setError(null);
    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          context: context.trim() || null,
          owner: owner.trim() || null,
          status: "proposed"
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to create decision.");
      }
      setTitle("");
      setContext("");
      setOwner("");
      await loadDecisions();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to create decision.");
    } finally {
      setSaving(null);
    }
  }

  async function updateStatus(decisionId: string, status: DecisionStatus) {
    setSaving(decisionId);
    setError(null);
    try {
      const response = await fetch(`/api/decisions/${decisionId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to update decision.");
      }
      await loadDecisions();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to update decision.");
    } finally {
      setSaving(null);
    }
  }

  const groups = useMemo(
    () => ({
      proposed: decisions.filter((item) => item.status === "proposed"),
      approved: decisions.filter((item) => item.status === "approved"),
      implemented: decisions.filter((item) => item.status === "implemented")
    }),
    [decisions]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[30px] font-semibold">Decisions</h1>
        <p className="text-[13px] text-textSecondary">Decision ledger with status progression.</p>
      </div>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="mb-3 text-[16px] font-semibold">Create decision</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Decision title"
            className="h-10 rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
          />
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner"
            className="h-10 rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
          />
          <button
            type="button"
            onClick={() => void createDecision()}
            disabled={saving === "create"}
            className="h-10 rounded-[10px] bg-[#111418] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            {saving === "create" ? "Saving..." : "Create"}
          </button>
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Context"
            className="min-h-20 rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[13px] sm:col-span-3"
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {(["proposed", "approved", "implemented"] as const).map((status) => (
          <Card key={status} className="border border-black/10 p-4 shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold capitalize">{status}</p>
              <span className="text-[12px] text-textSecondary">{groups[status].length}</span>
            </div>
            <div className="space-y-2">
              {groups[status].map((decision) => (
                <div key={decision.id} className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
                  <p className="text-[13px] font-semibold text-textPrimary">{decision.title}</p>
                  {decision.context ? <p className="mt-1 text-[12px] text-textSecondary">{decision.context}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["proposed", "approved", "implemented"] as const).map((nextStatus) => (
                      <button
                        key={nextStatus}
                        type="button"
                        disabled={saving === decision.id || decision.status === nextStatus}
                        onClick={() => void updateStatus(decision.id, nextStatus)}
                        className={`h-7 rounded-pill px-2 text-[11px] ${
                          decision.status === nextStatus
                            ? "bg-[#111418] text-white"
                            : "border border-black/10 bg-white text-textSecondary"
                        } disabled:opacity-70`}
                      >
                        {nextStatus}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!loading && groups[status].length === 0 ? (
                <p className="text-[12px] text-textSecondary">No {status} decisions.</p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
