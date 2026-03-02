"use client";

import { Card } from "@chief/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatTimeRange } from "@/lib/format";

interface TodayPriority {
  task_id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "medium" | "high";
  score: number;
  key_result_id?: string | null;
  key_result_metric?: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "medium" | "high";
  status: string;
}

interface MeetingRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface RiskRow {
  kind: string;
  title: string;
  detail: string;
  severity: string;
  source_id?: string;
}

interface TodayPayload {
  date: string;
  top_priorities: TodayPriority[];
  overdue: TaskRow[];
  meetings_today: MeetingRow[];
  risks: RiskRow[];
  queue_count: number;
}

function formatDate(input: string | null) {
  if (!input) return "No due date";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString();
}

function riskHref(risk: RiskRow) {
  if (risk.kind === "overdue") {
    return risk.source_id ? `/app/tasks?filter=overdue&task_id=${risk.source_id}` : "/app/tasks?filter=overdue";
  }

  if (risk.kind === "delegation_stuck" || risk.kind === "delegated_stuck") {
    return risk.source_id ? `/app/tasks?filter=waiting&task_id=${risk.source_id}` : "/app/tasks?filter=waiting";
  }

  if (risk.kind === "snoozed") {
    return "/app/queue";
  }

  if (risk.kind === "execution_drift") {
    return "/app/execution";
  }

  return null;
}

function riskTargetHint(risk: RiskRow) {
  if (risk.kind === "snoozed") return "Opens Queue";
  if (risk.kind === "execution_drift") return "Opens Execution";
  if (risk.kind === "overdue" || risk.kind === "delegation_stuck" || risk.kind === "delegated_stuck") {
    return "Opens Tasks";
  }
  return "";
}

function tasksBulkHref(taskIds: string[], filter?: "all" | "overdue" | "waiting") {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  params.set("selected_task_ids", taskIds.join(","));
  return `/app/tasks?${params.toString()}`;
}

export default function TodayBriefPage() {
  const router = useRouter();
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastActionSummary, setLastActionSummary] = useState<string | null>(null);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [bulkScope, setBulkScope] = useState<"priorities" | "overdue" | "risks" | null>(null);

  const riskTaskIds = Array.from(
    new Set(
      data?.risks
        .filter(
          (risk) =>
            Boolean(risk.source_id) &&
            (risk.kind === "overdue" || risk.kind === "delegation_stuck" || risk.kind === "delegated_stuck")
        )
        .map((risk) => String(risk.source_id)) ?? []
    )
  );

  async function loadToday() {
    const response = await fetch("/api/today", { method: "GET", cache: "no-store" });
    const payload = (await response.json()) as TodayPayload | { error?: { message?: string } };

    if (!response.ok) {
      throw new Error((payload as { error?: { message?: string } }).error?.message ?? "Unable to load today.");
    }

    setData(payload as TodayPayload);
  }

  async function completeFromToday(taskId: string) {
    setActionTaskId(taskId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "Unable to complete task.");
      }

      const payload = (await response.json()) as { changed?: boolean };

      await loadToday();
      const summary = payload.changed === false ? "Task was already completed." : "Task marked done.";
      setMessage(summary);
      setLastActionSummary(summary);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Unable to complete task.";
      setError(message);
    } finally {
      setActionTaskId(null);
    }
  }

  async function completeManyFromToday(taskIds: string[], scope: "priorities" | "overdue" | "risks") {
    if (taskIds.length === 0) return;

    setBulkScope(scope);
    setError(null);
    setMessage(null);

    try {
      const results = await Promise.all(
        taskIds.map(async (taskId) => {
          const response = await fetch(`/api/tasks/${taskId}/complete`, {
            method: "POST",
            headers: { "content-type": "application/json" }
          });

          if (!response.ok) {
            const payload = (await response.json()) as { error?: { message?: string } };
            throw new Error(payload.error?.message ?? "Unable to complete selected tasks.");
          }

          const payload = (await response.json()) as { changed?: boolean };
          return payload.changed !== false;
        })
      );

      const changedCount = results.filter(Boolean).length;

      await loadToday();
      const summary =
        changedCount > 0 ? `Marked ${changedCount} task(s) done.` : "All selected tasks were already completed.";
      setMessage(summary);
      setLastActionSummary(summary);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Unable to complete selected tasks.";
      setError(message);
    } finally {
      setBulkScope(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        await loadToday();
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error && err.message ? err.message : "Unable to load today.";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  if (loading) {
    return <div className="grid min-h-[40vh] place-items-center rounded-[20px] bg-white text-[14px] text-textSecondary">Loading today...</div>;
  }

  if (error || !data) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-[20px] bg-white text-[14px] text-[#b42318]">
        {error ?? "Unable to load today."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-semibold">Today</h1>
            {lastActionSummary ? (
              <span className="rounded-pill bg-chipBg px-3 py-1 text-[11px] text-textSecondary">{lastActionSummary}</span>
            ) : null}
          </div>
          <p className="text-[13px] text-textSecondary">Executive briefing for {data.date}</p>
        </div>
        <div className="rounded-pill bg-chipBg px-4 py-2 text-[13px] text-textSecondary">
          {data.queue_count} item(s) pending in queue
        </div>
      </div>

      {message ? (
        <p className="text-[13px] font-medium text-[#106C2A]" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-[13px] font-medium text-[#b42318]" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}

      <Card className="border border-black/10 p-4 shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[17px] font-semibold">Top priorities</p>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-textSecondary">Top 3</span>
            <button
              type="button"
              disabled={data.top_priorities.length === 0}
              aria-label="Open top priorities in tasks"
              onClick={() =>
                router.push(tasksBulkHref(data.top_priorities.map((item) => item.task_id), "all"))
              }
              className="h-7 rounded-pill border border-black/10 bg-white px-3 text-[11px] text-textSecondary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              Open in Tasks
            </button>
            <button
              type="button"
              disabled={data.top_priorities.length === 0 || bulkScope !== null || actionTaskId !== null}
              aria-label="Mark all top priorities done"
              onClick={() => void completeManyFromToday(data.top_priorities.map((item) => item.task_id), "priorities")}
              className="h-7 rounded-pill border border-[#ABEFC6] bg-[#ECFDF3] px-3 text-[11px] text-[#067647] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              {bulkScope === "priorities" ? "Saving..." : "Mark all done"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {data.top_priorities.map((priority) => (
            <div key={priority.task_id} className="w-full rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
              <button
                type="button"
                onClick={() => router.push(`/app/tasks?task_id=${priority.task_id}`)}
                className="w-full text-left transition hover:opacity-85"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-textPrimary">{priority.title}</p>
                    <p className="text-[12px] text-textSecondary">Due {formatDate(priority.due_at)}</p>
                    {priority.key_result_metric ? (
                      <p className="mt-1 text-[11px] text-textSecondary">KR: {priority.key_result_metric}</p>
                    ) : null}
                  </div>
                  <span className="rounded-pill bg-chipBg px-2 py-1 text-[11px] text-textSecondary">Score {priority.score}</span>
                </div>
              </button>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={actionTaskId === priority.task_id}
                  onClick={() => void completeFromToday(priority.task_id)}
                  className="h-7 rounded-pill border border-[#ABEFC6] bg-[#ECFDF3] px-3 text-[11px] text-[#067647] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                >
                  {actionTaskId === priority.task_id ? "Saving..." : "Mark done"}
                </button>
              </div>
            </div>
          ))}
          {data.top_priorities.length === 0 ? (
            <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
              No priorities available.
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border border-black/10 p-4 shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[16px] font-semibold">Overdue tasks</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={data.overdue.length === 0}
                aria-label="Open overdue tasks in tasks"
                onClick={() => router.push(tasksBulkHref(data.overdue.map((task) => task.id), "overdue"))}
                className="h-7 rounded-pill border border-black/10 bg-white px-3 text-[11px] text-textSecondary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              >
                Open in Tasks
              </button>
              <button
                type="button"
                disabled={data.overdue.length === 0 || bulkScope !== null || actionTaskId !== null}
                aria-label="Mark all overdue tasks done"
                onClick={() => void completeManyFromToday(data.overdue.map((task) => task.id), "overdue")}
                className="h-7 rounded-pill border border-[#ABEFC6] bg-[#ECFDF3] px-3 text-[11px] text-[#067647] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              >
                {bulkScope === "overdue" ? "Saving..." : "Mark all done"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {data.overdue.map((task) => (
              <div key={task.id} className="w-full rounded-[12px] border border-black/10 bg-[#FFF6F7] p-3">
                <button
                  type="button"
                  onClick={() => router.push(`/app/tasks?filter=overdue&task_id=${task.id}`)}
                  className="w-full text-left transition hover:opacity-85"
                >
                  <p className="text-[13px] font-semibold text-textPrimary">{task.title}</p>
                  <p className="text-[12px] text-textSecondary">Due {formatDate(task.due_at)}</p>
                </button>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={actionTaskId === task.id}
                    onClick={() => void completeFromToday(task.id)}
                    className="h-7 rounded-pill border border-[#ABEFC6] bg-[#ECFDF3] px-3 text-[11px] text-[#067647] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                  >
                    {actionTaskId === task.id ? "Saving..." : "Mark done"}
                  </button>
                </div>
              </div>
            ))}
            {data.overdue.length === 0 ? (
              <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
                No overdue tasks.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="border border-black/10 p-4 shadow-none">
          <p className="mb-3 text-[16px] font-semibold">Today&apos;s meetings</p>
          <div className="space-y-2">
            {data.meetings_today.map((meeting) => (
              <button
                key={meeting.id}
                type="button"
                onClick={() => router.push(`/app/meetings?filter=all&meeting_id=${meeting.id}`)}
                className="w-full rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-left transition hover:bg-[#F2F4F7]"
              >
                <p className="text-[13px] font-semibold text-textPrimary">{meeting.title}</p>
                <p className="text-[12px] text-textSecondary">{formatTimeRange(meeting.start_time, meeting.end_time)}</p>
              </button>
            ))}
            {data.meetings_today.length === 0 ? (
              <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
                No meetings scheduled.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="border border-black/10 p-4 shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[16px] font-semibold">Risks</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={riskTaskIds.length === 0}
              aria-label="Open risk linked tasks in tasks"
              onClick={() => router.push(tasksBulkHref(riskTaskIds, "all"))}
              className="h-7 rounded-pill border border-black/10 bg-white px-3 text-[11px] text-textSecondary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              Open in Tasks
            </button>
            <button
              type="button"
              disabled={riskTaskIds.length === 0 || bulkScope !== null || actionTaskId !== null}
              aria-label="Resolve risk linked tasks"
              onClick={() => void completeManyFromToday(riskTaskIds, "risks")}
              className="h-7 rounded-pill border border-[#ABEFC6] bg-[#ECFDF3] px-3 text-[11px] text-[#067647] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              {bulkScope === "risks" ? "Saving..." : "Resolve task risks"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {data.risks.map((risk) => {
            const href = riskHref(risk);

            if (!href) {
              return (
                <div key={`${risk.kind}-${risk.title}`} className="rounded-[12px] border border-black/10 bg-[#FFF9F2] p-3">
                  <p className="text-[13px] font-semibold text-textPrimary">{risk.title}</p>
                  <p className="text-[12px] text-textSecondary">{risk.detail}</p>
                </div>
              );
            }

            return (
              <button
                key={`${risk.kind}-${risk.title}`}
                type="button"
                onClick={() => router.push(href)}
                className="w-full rounded-[12px] border border-black/10 bg-[#FFF9F2] p-3 text-left transition hover:bg-[#FFF4E8]"
              >
                <p className="text-[13px] font-semibold text-textPrimary">{risk.title}</p>
                <p className="text-[12px] text-textSecondary">{risk.detail}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-textTertiary">{riskTargetHint(risk)}</p>
              </button>
            );
          })}
          {data.risks.length === 0 ? (
            <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
              No risk signals detected.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
