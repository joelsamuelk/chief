import type { ExtractedItem, Task } from "@chief/types";
import { daysSince, hoursSince } from "@/lib/utils/dates";

export interface RiskObject {
  kind: "overdue" | "snoozed" | "delegated_unacknowledged";
  title: string;
  detail: string;
  confidence: number;
  evidence: Array<{
    type: "task" | "queue_item";
    id: string;
    title: string;
  }>;
}

function isActiveTask(task: Task) {
  return task.status === "open" || task.status === "waiting";
}

export function detectRiskObjects(tasks: Task[], queueItems: ExtractedItem[], now = new Date()): RiskObject[] {
  const risks: RiskObject[] = [];

  for (const task of tasks) {
    const dueAtRaw = task.due_at ?? task.end_at ?? task.start_at;
    if (dueAtRaw && isActiveTask(task)) {
      const age = daysSince(dueAtRaw, now);
      if (age > 3) {
        risks.push({
          kind: "overdue",
          title: `Overdue task: ${task.title}`,
          detail: `${Math.floor(age)} days overdue.`,
          confidence: 0.92,
          evidence: [{ type: "task", id: task.id, title: task.title }]
        });
      }
    }

    if (task.delegated_to && !task.delegated_acknowledged_at) {
      const delegationAgeHours = hoursSince(task.created_at, now);
      if (delegationAgeHours > 48) {
        risks.push({
          kind: "delegated_unacknowledged",
          title: `Delegation stuck: ${task.title}`,
          detail: `No acknowledgment after ${Math.floor(delegationAgeHours)} hours.`,
          confidence: 0.86,
          evidence: [{ type: "task", id: task.id, title: task.title }]
        });
      }
    }
  }

  for (const item of queueItems) {
    if ((item.snooze_count ?? 0) > 2) {
      risks.push({
        kind: "snoozed",
        title: `Repeatedly snoozed: ${item.title}`,
        detail: `Snoozed ${item.snooze_count} times.`,
        confidence: 0.8,
        evidence: [{ type: "queue_item", id: item.id, title: item.title }]
      });
    }
  }

  return risks;
}
