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

  return null;
}

function riskTargetHint(risk: RiskRow) {
  if (risk.kind === "snoozed") return "Opens Queue";
  if (risk.kind === "overdue" || risk.kind === "delegation_stuck" || risk.kind === "delegated_stuck") {
    return "Opens Tasks";
  }
  return "";
}

export default function TodayBriefPage() {
  const router = useRouter();
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/today", { method: "GET", cache: "no-store" });
        const payload = (await response.json()) as TodayPayload | { error?: { message?: string } };

        if (!response.ok) {
          throw new Error((payload as { error?: { message?: string } }).error?.message ?? "Unable to load today.");
        }

        if (active) {
          setData(payload as TodayPayload);
        }
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
          <h1 className="text-[30px] font-semibold">Today</h1>
          <p className="text-[13px] text-textSecondary">Executive briefing for {data.date}</p>
        </div>
        <div className="rounded-pill bg-chipBg px-4 py-2 text-[13px] text-textSecondary">
          {data.queue_count} item(s) pending in queue
        </div>
      </div>

      <Card className="border border-black/10 p-4 shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[17px] font-semibold">Top priorities</p>
          <span className="text-[12px] text-textSecondary">Top 3</span>
        </div>
        <div className="space-y-2">
          {data.top_priorities.map((priority) => (
            <button
              key={priority.task_id}
              type="button"
              onClick={() => router.push(`/app/tasks?task_id=${priority.task_id}`)}
              className="w-full rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-left transition hover:bg-[#F2F4F7]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-textPrimary">{priority.title}</p>
                  <p className="text-[12px] text-textSecondary">Due {formatDate(priority.due_at)}</p>
                </div>
                <span className="rounded-pill bg-chipBg px-2 py-1 text-[11px] text-textSecondary">Score {priority.score}</span>
              </div>
            </button>
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
          <p className="mb-3 text-[16px] font-semibold">Overdue tasks</p>
          <div className="space-y-2">
            {data.overdue.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => router.push(`/app/tasks?filter=overdue&task_id=${task.id}`)}
                className="w-full rounded-[12px] border border-black/10 bg-[#FFF6F7] p-3 text-left transition hover:bg-[#FFEFF2]"
              >
                <p className="text-[13px] font-semibold text-textPrimary">{task.title}</p>
                <p className="text-[12px] text-textSecondary">Due {formatDate(task.due_at)}</p>
              </button>
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
        <p className="mb-3 text-[16px] font-semibold">Risks</p>
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
