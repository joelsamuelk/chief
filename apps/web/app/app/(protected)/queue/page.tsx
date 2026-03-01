"use client";

import { Card } from "@chief/ui/web";
import { useEffect, useMemo, useState } from "react";

interface QueueItem {
  id: string;
  source_id: string;
  kind: "task" | "decision" | "follow_up" | "risk" | "summary";
  status: "pending" | "accepted" | "dismissed" | "snoozed";
  title: string;
  body: string | null;
  due_at: string | null;
  confidence: number;
  snoozed_until: string | null;
}

interface QueueGroup {
  source_id: string;
  extracted_items: QueueItem[];
}

interface QueuePayload {
  items: QueueItem[];
  grouped: QueueGroup[];
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleString();
}

export default function QueuePage() {
  const [data, setData] = useState<QueuePayload>({ items: [], grouped: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/queue", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as QueuePayload | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error((payload as { error?: { message?: string } }).error?.message ?? "Unable to load queue.");
      }
      setData(payload as QueuePayload);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to load queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function runAction(itemId: string, action: "accept" | "dismiss" | "snooze") {
    setBusyId(itemId);
    setError(null);
    try {
      if (action === "snooze") {
        const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const response = await fetch("/api/queue/snooze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: itemId, until })
        });
        if (!response.ok) throw new Error("Unable to snooze item.");
      } else {
        const response = await fetch(`/api/queue/${action}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: itemId })
        });
        if (!response.ok) throw new Error(`Unable to ${action} item.`);
      }

      await loadQueue();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Queue action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = useMemo(
    () => data.items.filter((item) => item.status === "pending" || item.status === "snoozed").length,
    [data.items]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold">Action Queue</h1>
          <p className="text-[13px] text-textSecondary">Approve, snooze, or dismiss extracted intelligence.</p>
        </div>
        <div className="rounded-pill bg-chipBg px-4 py-2 text-[13px] text-textSecondary">{pendingCount} item(s) active</div>
      </div>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      {loading ? (
        <div className="rounded-[16px] border border-black/10 bg-white p-4 text-[13px] text-textSecondary">Loading queue...</div>
      ) : null}

      {!loading && data.grouped.length === 0 ? (
        <div className="rounded-[16px] border border-black/10 bg-white p-4 text-[13px] text-textSecondary">
          Queue is clear.
        </div>
      ) : null}

      <div className="space-y-3">
        {data.grouped.map((group) => (
          <Card key={group.source_id} className="border border-black/10 p-4 shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-textSecondary">Source {group.source_id.slice(0, 8)}</p>
              <span className="text-[12px] text-textSecondary">{group.extracted_items.length} item(s)</span>
            </div>
            <div className="space-y-2">
              {group.extracted_items.map((item) => (
                <div key={item.id} className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-pill bg-chipBg px-2 py-1 text-textSecondary">{item.kind}</span>
                    <span className="rounded-pill bg-chipBg px-2 py-1 text-textSecondary">Confidence {(item.confidence * 100).toFixed(0)}%</span>
                    <span className="text-textTertiary">Due {formatDate(item.due_at)}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-textPrimary">{item.title}</p>
                  {item.body ? <p className="mt-1 text-[12px] text-textSecondary">{item.body}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void runAction(item.id, "accept")}
                      disabled={busyId === item.id}
                      className="h-8 rounded-pill bg-[#111418] px-3 text-[11px] font-medium text-white disabled:opacity-70"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(item.id, "snooze")}
                      disabled={busyId === item.id}
                      className="h-8 rounded-pill border border-black/10 bg-white px-3 text-[11px] font-medium text-textSecondary disabled:opacity-70"
                    >
                      Snooze 1 day
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(item.id, "dismiss")}
                      disabled={busyId === item.id}
                      className="h-8 rounded-pill bg-[#FBE9EA] px-3 text-[11px] font-medium text-[#A12A32] disabled:opacity-70"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
