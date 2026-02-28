import type { ServerAuthContext } from "@chief/data/server";
import type { Meeting, Task, TodayPriority, TodayResponse } from "@chief/types";
import { requireSupabase } from "../server/http";
import { detectRisks } from "./risk-service";

function scoreTask(task: Task, now: Date) {
  const dueAtRaw = task.due_at ?? task.end_at ?? task.start_at;
  let score = 0;

  if (dueAtRaw) {
    const dueAt = new Date(dueAtRaw);
    const deltaHours = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (deltaHours < 0) {
      score += 100 + Math.min(60, Math.abs(deltaHours));
    } else {
      score += Math.max(0, 50 - deltaHours);
    }
  }

  if (task.priority === "high") score += 30;
  if (task.priority === "medium" || task.priority === "med") score += 15;
  if (task.status === "waiting") score += 25;
  if (task.delegated_to && !task.delegated_acknowledged_at) score += 35;

  return score;
}

function isOverdue(task: Task, now: Date) {
  const dueAtRaw = task.due_at ?? task.end_at ?? task.start_at;
  if (!dueAtRaw) return false;
  if (task.status === "completed" || task.status === "done" || task.status === "archived") return false;
  return new Date(dueAtRaw).getTime() < now.getTime();
}

export async function getTodaySummary(context: ServerAuthContext): Promise<TodayResponse> {
  const supabase = requireSupabase(context);
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const [
    { data: tasks, error: tasksError },
    { data: meetings, error: meetingsError },
    { count: queueCount, error: queueError },
    risks
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase
      .from("meetings")
      .select("*")
      .gte("start_time", start.toISOString())
      .lte("start_time", end.toISOString())
      .order("start_time", { ascending: true }),
    supabase
      .from("extracted_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    detectRisks(context)
  ]);

  if (tasksError) throw tasksError;
  if (meetingsError) throw meetingsError;
  if (queueError) throw queueError;

  const allTasks = (tasks ?? []) as Task[];
  const activeTasks = allTasks.filter(
    (task) => task.status !== "completed" && task.status !== "done" && task.status !== "archived"
  );

  const topPriorities = activeTasks
    .map((task) => ({
      task_id: task.id,
      title: task.title,
      due_at: task.due_at ?? task.end_at ?? task.start_at,
      priority: task.priority,
      delegated_to: task.delegated_to ?? null,
      score: scoreTask(task, now)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3) as TodayPriority[];

  const overdue = allTasks.filter((task) => isOverdue(task, now));

  const today: TodayResponse = {
    date: now.toISOString().slice(0, 10),
    top_priorities: topPriorities,
    overdue,
    meetings_today: (meetings ?? []) as Meeting[],
    risks,
    queue_count: queueCount ?? 0
  };

  const snapshotBase = supabase
    .from("today_snapshots")
    .delete()
    .eq("user_id", context.userId)
    .eq("date", today.date);

  if (context.orgId) {
    await snapshotBase.eq("org_id", context.orgId);
  } else {
    await snapshotBase.is("org_id", null);
  }

  await supabase.from("today_snapshots").insert({
    user_id: context.userId,
    org_id: context.orgId,
    date: today.date,
    top_priorities: today.top_priorities,
    risks: today.risks
  });

  return today;
}
