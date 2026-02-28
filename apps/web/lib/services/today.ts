import type { ExtractedItem, Meeting, Task } from "@chief/types";
import type { AuthContext } from "@/lib/utils/auth";
import { prioritizeTasks } from "@/lib/ai/prioritize";
import { detectRiskObjects, type RiskObject } from "@/lib/ai/risks";
import { toIsoDate } from "@/lib/utils/dates";
import { getMeetingsForDate } from "./meetings";

export interface TodaySnapshot {
  date: string;
  top_priorities: Array<{
    task_id: string;
    title: string;
    score: number;
    due_at: string | null;
    priority: string;
    delegated_to: string | null;
  }>;
  overdue: Task[];
  meetings_today: Meeting[];
  risks: RiskObject[];
  queue_count: number;
}

function dueAt(task: Task) {
  return task.due_at ?? task.end_at ?? task.start_at;
}

function isOverdue(task: Task, now = new Date()) {
  const due = dueAt(task);
  if (!due) return false;
  return task.status === "open" && new Date(due).getTime() < now.getTime();
}

export async function detectRisks(context: AuthContext): Promise<RiskObject[]> {
  const [{ data: tasks, error: tasksError }, { data: queueItems, error: queueError }] = await Promise.all([
    context.supabase.from("tasks").select("*"),
    context.supabase.from("extracted_items").select("*")
  ]);
  if (tasksError) throw tasksError;
  if (queueError) throw queueError;
  return detectRiskObjects((tasks ?? []) as Task[], (queueItems ?? []) as ExtractedItem[]);
}

export async function getTodaySnapshot(context: AuthContext): Promise<TodaySnapshot> {
  const [{ data: tasksData, error: tasksError }, { count: queueCount, error: queueError }, meetings, risks] =
    await Promise.all([
      context.supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      context.supabase.from("extracted_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
      getMeetingsForDate(context),
      detectRisks(context)
    ]);

  if (tasksError) throw tasksError;
  if (queueError) throw queueError;

  const tasks = (tasksData ?? []) as Task[];
  const now = new Date();

  const priorities = prioritizeTasks(
    tasks.filter((task) => task.status !== "completed" && task.status !== "done" && task.status !== "archived"),
    now,
    3
  ).map((item) => ({
    task_id: item.task.id,
    title: item.task.title,
    score: item.score,
    due_at: dueAt(item.task) ?? null,
    priority: item.task.priority,
    delegated_to: item.task.delegated_to ?? null
  }));

  const snapshot: TodaySnapshot = {
    date: toIsoDate(now),
    top_priorities: priorities,
    overdue: tasks.filter((task) => isOverdue(task, now)),
    meetings_today: meetings,
    risks,
    queue_count: queueCount ?? 0
  };

  let deleteQuery = context.supabase
    .from("today_snapshots")
    .delete()
    .eq("user_id", context.userId)
    .eq("date", snapshot.date);

  if (context.orgId) {
    deleteQuery = deleteQuery.eq("org_id", context.orgId);
  } else {
    deleteQuery = deleteQuery.is("org_id", null);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;

  const { error: insertError } = await context.supabase.from("today_snapshots").insert({
    user_id: context.userId,
    org_id: context.orgId,
    date: snapshot.date,
    top_priorities: snapshot.top_priorities,
    risks: snapshot.risks
  });
  if (insertError) throw insertError;

  return snapshot;
}
