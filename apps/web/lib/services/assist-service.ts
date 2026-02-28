import type { ServerAuthContext } from "@chief/data/server";
import type { AssistCommand, AssistRequest, AssistResponse, Decision, Meeting, Task } from "@chief/types";
import { requireSupabase } from "../server/http";
import { listPendingDecisions } from "./decision-service";
import { detectRisks } from "./risk-service";
import { getTodaySummary } from "./today-service";

function detectCommand(prompt: string): AssistCommand {
  const lower = prompt.toLowerCase();

  if (/(waiting on|waiting for)/.test(lower)) return "what_am_i_waiting_on";
  if (/(at risk|risk)/.test(lower)) return "what_is_at_risk";
  if (/(summarize today|summary today|today summary)/.test(lower)) return "summarize_today";
  if (/(prepare me|meeting)/.test(lower)) return "prepare_me_for_meeting";
  return "show_pending_decisions";
}

function parseMeetingTarget(prompt: string, fallback?: string) {
  if (fallback) {
    const date = new Date(fallback);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const lower = prompt.toLowerCase();
  const match = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const period = match[3];

  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  return target;
}

function compactIds(list: string[]) {
  return list.filter(Boolean).slice(0, 8);
}

export async function runAssist(context: ServerAuthContext, request: AssistRequest): Promise<AssistResponse> {
  const supabase = requireSupabase(context);
  const command = detectCommand(request.prompt);

  if (command === "what_am_i_waiting_on") {
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,delegated_to,status,delegated_acknowledged_at")
      .or("status.eq.waiting,delegated_to.not.is.null")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    const tasks = (data ?? []) as Pick<Task, "id" | "title" | "delegated_to" | "status" | "delegated_acknowledged_at">[];
    const lines = tasks.map((task) => {
      const delegate = task.delegated_to ? ` delegated_to=${task.delegated_to}` : "";
      const ack = task.delegated_acknowledged_at ? "acknowledged" : "unacknowledged";
      return `- ${task.title} (${task.status}, ${ack}${delegate})`;
    });

    return {
      command,
      answer: lines.length > 0 ? lines.join("\n") : "No waiting items found.",
      confidence: lines.length > 0 ? 0.9 : 0.78,
      evidence: tasks.map((task) => ({
        table: "tasks",
        id: task.id,
        title: task.title,
        reason: "waiting_or_delegated"
      }))
    };
  }

  if (command === "what_is_at_risk") {
    const risks = await detectRisks(context);
    return {
      command,
      answer:
        risks.length > 0
          ? risks
              .slice(0, 8)
              .map((risk) => `- ${risk.title}: ${risk.detail}`)
              .join("\n")
          : "No active risks detected.",
      confidence: risks.length > 0 ? 0.89 : 0.8,
      evidence: risks.slice(0, 8).map((risk) => ({
        table: risk.source_table,
        id: risk.source_id,
        title: risk.title,
        reason: risk.kind
      }))
    };
  }

  if (command === "summarize_today") {
    const summary = await getTodaySummary(context);
    const answer = [
      `Top priorities: ${summary.top_priorities.length}`,
      `Overdue: ${summary.overdue.length}`,
      `Meetings today: ${summary.meetings_today.length}`,
      `Risks: ${summary.risks.length}`,
      `Queue pending: ${summary.queue_count}`
    ].join("\n");

    return {
      command,
      answer,
      confidence: 0.9,
      evidence: [
        ...summary.top_priorities.map((item) => ({
          table: "tasks",
          id: item.task_id,
          title: item.title,
          reason: "priority_score"
        })),
        ...summary.meetings_today.map((meeting) => ({
          table: "meetings",
          id: meeting.id,
          title: meeting.title,
          reason: "meeting_today"
        }))
      ]
    };
  }

  if (command === "prepare_me_for_meeting") {
    const target = parseMeetingTarget(request.prompt, request.meeting_time);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const { data: meetingsData, error: meetingsError } = await supabase
      .from("meetings")
      .select("*")
      .gte("start_time", start.toISOString())
      .lte("start_time", end.toISOString())
      .order("start_time", { ascending: true });

    if (meetingsError) throw meetingsError;

    const meetings = (meetingsData ?? []) as Meeting[];
    const meeting = meetings
      .map((candidate) => ({
        meeting: candidate,
        delta: target
          ? Math.abs(new Date(candidate.start_time).getTime() - target.getTime())
          : new Date(candidate.start_time).getTime()
      }))
      .sort((a, b) => a.delta - b.delta)[0]?.meeting;

    if (!meeting) {
      return {
        command,
        answer: "No meetings found for today.",
        confidence: 0.84,
        evidence: []
      };
    }

    const attendeeCount = Array.isArray(meeting.attendees) ? meeting.attendees.length : 0;

    const relatedTaskIds = compactIds([
      ...(typeof meeting.source_id === "string" ? [meeting.source_id] : [])
    ]);

    const { data: taskData } = await supabase
      .from("tasks")
      .select("id,title,status,due_at")
      .in("source_id", relatedTaskIds.length > 0 ? relatedTaskIds : ["00000000-0000-0000-0000-000000000000"])
      .limit(5);

    const relatedTasks = (taskData ?? []) as Pick<Task, "id" | "title" | "status" | "due_at">[];

    const answerLines = [
      `Meeting: ${meeting.title}`,
      `Time: ${meeting.start_time} to ${meeting.end_time}`,
      `Attendees: ${attendeeCount}`,
      `Notes: ${meeting.notes ?? "No notes captured."}`,
      relatedTasks.length > 0
        ? `Related tasks:\n${relatedTasks.map((task) => `- ${task.title} (${task.status})`).join("\n")}`
        : "Related tasks: none found."
    ];

    return {
      command,
      answer: answerLines.join("\n"),
      confidence: 0.86,
      evidence: [
        {
          table: "meetings",
          id: meeting.id,
          title: meeting.title,
          reason: "closest_requested_time"
        },
        ...relatedTasks.map((task) => ({
          table: "tasks",
          id: task.id,
          title: task.title,
          reason: "linked_by_source"
        }))
      ]
    };
  }

  const pendingDecisions = await listPendingDecisions(context);
  return {
    command: "show_pending_decisions",
    answer:
      pendingDecisions.length > 0
        ? pendingDecisions.map((decision) => `- ${decision.title} (${decision.status ?? "proposed"})`).join("\n")
        : "No pending decisions.",
    confidence: pendingDecisions.length > 0 ? 0.91 : 0.82,
    evidence: pendingDecisions.map((decision) => ({
      table: "decisions",
      id: decision.id,
      title: decision.title,
      reason: "status_in_proposed_or_approved"
    }))
  };
}
