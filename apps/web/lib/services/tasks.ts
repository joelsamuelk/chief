import { getDefaultContext, getRepos } from "../storage";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../storage";

export type TaskFilter =
  | "all"
  | "today"
  | "overdue"
  | "upcoming"
  | "waiting"
  | "completed"
  | "archived";

function dayKey(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDone(task: Task) {
  return task.status === "completed" || task.status === "archived";
}

export function getTasks(filter: TaskFilter = "all") {
  const repos = getRepos();
  const context = getDefaultContext();
  const tasks = repos.task.list(context);
  const now = new Date();
  const today = dayKey(now);

  if (filter === "all") return tasks;
  if (filter === "archived") return tasks.filter((task) => task.status === "archived");
  if (filter === "completed") return tasks.filter((task) => task.status === "completed");
  if (filter === "waiting") {
    return tasks.filter(
      (task) => task.status === "waiting" || (task.delegated_to !== null && !task.delegated_acknowledged_at)
    );
  }

  if (filter === "today") {
    return tasks.filter((task) => {
      if (isDone(task)) return false;
      if (!task.due_at || !today) return false;
      return dayKey(task.due_at) === today;
    });
  }

  if (filter === "overdue") {
    return tasks.filter((task) => {
      if (isDone(task) || !task.due_at) return false;
      const due = new Date(task.due_at);
      return due.getTime() < now.getTime();
    });
  }

  return tasks.filter((task) => {
    if (isDone(task) || !task.due_at || !today) return false;
    const dueKey = dayKey(task.due_at);
    return !!dueKey && dueKey > today;
  });
}

export function createTask(payload: CreateTaskInput) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.task.create(context, {
    ...payload,
    priority: payload.priority ?? "medium",
    status: payload.status ?? "open"
  });
}

export function updateTask(taskId: string, payload: UpdateTaskInput) {
  const repos = getRepos();
  const context = getDefaultContext();
  const updated = repos.task.update(context, taskId, payload);
  if (!updated) throw new Error("Task not found.");
  return updated;
}

export interface CompleteTaskResult {
  task: Task;
  changed: boolean;
}

export function completeTask(taskId: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const current = repos.task.getById(context, taskId);
  if (!current) throw new Error("Task not found.");

  if (current.status === "completed" || current.status === "archived") {
    return { task: current, changed: false } satisfies CompleteTaskResult;
  }

  const updated = repos.task.update(context, taskId, {
    status: "completed",
    completed_at: new Date().toISOString()
  });

  if (!updated) throw new Error("Task not found.");
  return { task: updated, changed: true } satisfies CompleteTaskResult;
}

export function reopenTask(taskId: string) {
  return updateTask(taskId, {
    status: "open",
    completed_at: null
  });
}

export function archiveTask(taskId: string) {
  return updateTask(taskId, {
    status: "archived"
  });
}

export function delegateTask(taskId: string, memberId: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  return updateTask(taskId, {
    delegated_to: memberId,
    delegated_by: context.userId,
    delegated_acknowledged_at: null,
    status: "waiting"
  });
}

export function acknowledgeDelegation(taskId: string) {
  return updateTask(taskId, {
    delegated_acknowledged_at: new Date().toISOString(),
    status: "open"
  });
}

export function deleteTask(taskId: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const ok = repos.task.delete(context, taskId);
  if (!ok) throw new Error("Task not found.");
  return { ok: true };
}
