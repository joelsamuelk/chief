import type { Task } from "@chief/types";

export interface PrioritizedTask {
  task: Task;
  score: number;
}

function isCompleted(status: string) {
  return status === "completed" || status === "done" || status === "archived";
}

function hasBlockingSignal(task: Task) {
  const body = `${task.title} ${task.description ?? ""}`.toLowerCase();
  return task.status === "waiting" || /\b(block|blocked|depends on|dependency)\b/.test(body);
}

export function scoreTask(task: Task, now = new Date()) {
  if (isCompleted(task.status)) return -999;

  const dueAtRaw = task.due_at ?? task.end_at ?? task.start_at;
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
  const dueDate = dueAt ? dueAt.toISOString().slice(0, 10) : null;
  const today = now.toISOString().slice(0, 10);

  let score = 0;
  if (dueAt && dueAt.getTime() < now.getTime()) score += 3;
  if (dueDate === today) score += 2;
  if (task.priority === "high") score += 1;
  if (hasBlockingSignal(task)) score += 1;
  return score;
}

export function prioritizeTasks(tasks: Task[], now = new Date(), limit = 3): PrioritizedTask[] {
  return tasks
    .map((task) => ({ task, score: scoreTask(task, now) }))
    .filter((item) => item.score > -999)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
