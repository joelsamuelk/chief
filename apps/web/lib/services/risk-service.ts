import type { ServerAuthContext } from "@chief/data/server";
import type { ExtractedItem, RiskRecord, Task } from "@chief/types";
import { requireSupabase } from "../server/http";

function ageInDays(from: string, now: Date) {
  return (now.getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
}

export async function detectRisks(context: ServerAuthContext): Promise<RiskRecord[]> {
  const supabase = requireSupabase(context);
  const now = new Date();

  const [{ data: tasks, error: taskError }, { data: queueItems, error: queueError }] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("extracted_items").select("*").order("created_at", { ascending: false })
  ]);

  if (taskError) throw taskError;
  if (queueError) throw queueError;

  const risks: RiskRecord[] = [];

  for (const task of (tasks ?? []) as Task[]) {
    const dueAt = task.due_at ?? task.end_at ?? task.start_at;
    const isActive = task.status === "open" || task.status === "waiting";

    if (dueAt && isActive) {
      const overdueDays = ageInDays(dueAt, now);
      if (overdueDays > 3) {
        risks.push({
          kind: "overdue",
          severity: overdueDays > 7 ? "high" : "medium",
          title: `Overdue task: ${task.title}`,
          detail: `This task is overdue by ${Math.floor(overdueDays)} days.`,
          confidence: 0.92,
          evidence: [
            {
              label: "task_due_at",
              quote: dueAt,
              source_id: task.source_id ?? undefined
            }
          ],
          source_table: "tasks",
          source_id: task.id
        });
      }
    }

    if (task.delegated_to && !task.delegated_acknowledged_at) {
      const delegatedAge = ageInDays(task.created_at, now);
      if (delegatedAge > 1) {
        risks.push({
          kind: "delegation_stuck",
          severity: delegatedAge > 3 ? "high" : "medium",
          title: `Delegation not acknowledged: ${task.title}`,
          detail: `Delegated ${Math.floor(delegatedAge)} days ago with no acknowledgment.`,
          confidence: 0.84,
          evidence: [
            {
              label: "delegation_state",
              quote: `delegated_to=${task.delegated_to}, delegated_acknowledged_at=null`,
              source_id: task.source_id ?? undefined
            }
          ],
          source_table: "tasks",
          source_id: task.id
        });
      }
    }
  }

  for (const item of (queueItems ?? []) as ExtractedItem[]) {
    if ((item.snooze_count ?? 0) > 2) {
      risks.push({
        kind: "snoozed",
        severity: item.snooze_count > 4 ? "high" : "medium",
        title: `Queue item repeatedly snoozed: ${item.title}`,
        detail: `Snoozed ${item.snooze_count} times.`,
        confidence: 0.79,
        evidence: item.evidence,
        source_table: "extracted_items",
        source_id: item.id
      });
    }
  }

  return risks;
}
