import type { Task } from "@chief/types";
import type { AuthContext } from "@/lib/utils/auth";
import {
  detectAssistIntent,
  noDataResponse,
  type AssistAnswer,
  type AssistIntent,
  type AssistReference
} from "@/lib/ai/assist";
import { listPendingDecisions } from "./decisions";
import { getClosestMeetingForQuery } from "./meetings";
import { getTodaySnapshot } from "./today";
import { detectRisks } from "./today";

function asResponse(intent: AssistIntent, answer: string, references: AssistReference[]): AssistAnswer {
  return {
    intent,
    answer,
    references
  };
}

export async function handleAssistQuery(
  context: AuthContext,
  query: string,
  meetingTime?: string
): Promise<AssistAnswer> {
  const intent = detectAssistIntent(query);

  if (intent === "waiting_on") {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("id,title,status,delegated_to,delegated_acknowledged_at")
      .or("status.eq.waiting,delegated_to.not.is.null")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    const items = (data ?? []) as Array<
      Pick<Task, "id" | "title" | "status" | "delegated_to" | "delegated_acknowledged_at">
    >;
    if (items.length === 0) return noDataResponse(intent);

    const answer = items
      .map((item) => {
        const ack = item.delegated_acknowledged_at ? "acknowledged" : "unacknowledged";
        return `${item.title} (${item.status}, ${ack})`;
      })
      .join("\n");

    return asResponse(
      intent,
      answer,
      items.map((item) => ({ type: "task", id: item.id, title: item.title }))
    );
  }

  if (intent === "at_risk") {
    const risks = await detectRisks(context);
    if (risks.length === 0) return noDataResponse(intent);

    return asResponse(
      intent,
      risks
        .slice(0, 8)
        .map((risk) => `${risk.title} - ${risk.detail}`)
        .join("\n"),
      risks
        .slice(0, 8)
        .flatMap((risk) => risk.evidence.map((ev) => ({ type: "risk" as const, id: ev.id, title: risk.title })))
    );
  }

  if (intent === "summarize_today") {
    const today = await getTodaySnapshot(context);
    const references: AssistReference[] = [
      ...today.top_priorities.map((item) => ({ type: "task" as const, id: item.task_id, title: item.title })),
      ...today.meetings_today.map((item) => ({ type: "meeting" as const, id: item.id, title: item.title }))
    ];

    const answer = [
      `Top priorities: ${today.top_priorities.length}`,
      `Overdue: ${today.overdue.length}`,
      `Meetings today: ${today.meetings_today.length}`,
      `Risks: ${today.risks.length}`,
      `Pending queue: ${today.queue_count}`
    ].join("\n");
    return asResponse(intent, answer, references);
  }

  if (intent === "prepare_meeting") {
    const meeting = await getClosestMeetingForQuery(context, query, meetingTime);
    if (!meeting) return noDataResponse(intent);

    const sourceId = meeting.source_id;
    const { data: taskData, error: taskError } = sourceId
      ? await context.supabase
          .from("tasks")
          .select("id,title,status")
          .eq("source_id", sourceId)
          .limit(6)
      : { data: [], error: null };

    if (taskError) throw taskError;
    const relatedTasks = (taskData ?? []) as Array<{ id: string; title: string; status: string }>;

    const answer = [
      `Meeting: ${meeting.title}`,
      `Time: ${meeting.start_time} to ${meeting.end_time}`,
      `Notes: ${meeting.notes ?? "No notes captured."}`,
      relatedTasks.length > 0
        ? `Related tasks:\n${relatedTasks.map((task) => `- ${task.title} (${task.status})`).join("\n")}`
        : "Related tasks: none."
    ].join("\n");

    return asResponse(intent, answer, [
      { type: "meeting", id: meeting.id, title: meeting.title },
      ...relatedTasks.map((task) => ({ type: "task" as const, id: task.id, title: task.title }))
    ]);
  }

  const decisions = await listPendingDecisions(context);
  if (decisions.length === 0) return noDataResponse(intent);

  return asResponse(
    "pending_decisions",
    decisions.map((item) => `${item.title} (${item.status ?? "proposed"})`).join("\n"),
    decisions.map((item) => ({ type: "decision", id: item.id, title: item.title }))
  );
}
