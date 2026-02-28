export type AssistIntent =
  | "waiting_on"
  | "at_risk"
  | "summarize_today"
  | "prepare_meeting"
  | "pending_decisions";

export interface AssistReference {
  type: "task" | "meeting" | "decision" | "queue_item" | "risk";
  id: string;
  title: string;
}

export interface AssistAnswer {
  intent: AssistIntent;
  answer: string;
  references: AssistReference[];
}

export function detectAssistIntent(query: string): AssistIntent {
  const lower = query.toLowerCase();
  if (/(waiting on|what am i waiting)/.test(lower)) return "waiting_on";
  if (/(at risk|risk)/.test(lower)) return "at_risk";
  if (/(summarize today|summary today|today summary)/.test(lower)) return "summarize_today";
  if (/(prepare me|meeting|3pm|2pm|4pm|5pm)/.test(lower)) return "prepare_meeting";
  return "pending_decisions";
}

export function noDataResponse(intent: AssistIntent): AssistAnswer {
  return {
    intent,
    answer: "Not enough information.",
    references: []
  };
}
