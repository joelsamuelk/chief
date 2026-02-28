import type { ServerAuthContext } from "@chief/data/server";
import type { Task } from "@chief/types";
import { ApiError } from "../server/errors";
import { requireSupabase } from "../server/http";
import {
  coerceBoolean,
  normalizeTaskPriority,
  normalizeTaskStatus,
  optionalIsoDate,
  optionalString,
  requireString,
  toDateOnly
} from "./common";

export type TaskFilter = "all" | "today" | "upcoming" | "waiting" | "completed";

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: string | null;
  status?: string | null;
  source_id?: string | null;
  delegated_to?: string | null;
  org_id?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  due_at?: string | null;
  priority?: string;
  status?: string;
  delegated_to?: string | null;
  delegated_acknowledged_at?: string | null;
}

function isCompleted(task: Task) {
  return task.status === "completed" || task.status === "done";
}

export async function listTasks(context: ServerAuthContext, filter: TaskFilter) {
  const supabase = requireSupabase(context);

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const tasks = (data ?? []) as Task[];
  const today = toDateOnly();

  if (filter === "all") return tasks;

  if (filter === "waiting") {
    return tasks.filter((task) => task.status === "waiting");
  }

  if (filter === "completed") {
    return tasks.filter((task) => isCompleted(task));
  }

  if (filter === "today") {
    return tasks.filter((task) => {
      if (isCompleted(task) || task.status === "archived") return false;
      const dueDate = task.due_at?.slice(0, 10) ?? task.start_at?.slice(0, 10) ?? null;
      return dueDate === today;
    });
  }

  return tasks.filter((task) => {
    if (isCompleted(task) || task.status === "archived") return false;
    const dueDate = task.due_at?.slice(0, 10) ?? task.start_at?.slice(0, 10) ?? null;
    return !!dueDate && dueDate > today;
  });
}

export async function createTask(context: ServerAuthContext, payload: CreateTaskPayload) {
  const supabase = requireSupabase(context);

  const row = {
    user_id: context.userId,
    org_id: payload.org_id ?? context.orgId ?? null,
    title: requireString(payload.title, "title"),
    description: optionalString(payload.description),
    due_at: optionalIsoDate(payload.due_at),
    source_id: optionalString(payload.source_id),
    delegated_to: optionalString(payload.delegated_to),
    delegated_by: optionalString(payload.delegated_to) ? context.userId : null,
    priority: normalizeTaskPriority(payload.priority),
    status: normalizeTaskStatus(payload.status)
  };

  const { data, error } = await supabase.from("tasks").insert(row).select("*").single();
  if (error) throw error;

  return data as Task;
}

export async function updateTask(context: ServerAuthContext, taskId: string, payload: UpdateTaskPayload) {
  const supabase = requireSupabase(context);
  const patch: Record<string, unknown> = {};

  if (payload.title !== undefined) patch.title = requireString(payload.title, "title");
  if (payload.description !== undefined) patch.description = optionalString(payload.description);
  if (payload.due_at !== undefined) patch.due_at = optionalIsoDate(payload.due_at);
  if (payload.priority !== undefined) patch.priority = normalizeTaskPriority(payload.priority);
  if (payload.status !== undefined) patch.status = normalizeTaskStatus(payload.status);
  if (payload.delegated_to !== undefined) {
    patch.delegated_to = optionalString(payload.delegated_to);
    patch.delegated_by = optionalString(payload.delegated_to) ? context.userId : null;
  }
  if (payload.delegated_acknowledged_at !== undefined) {
    patch.delegated_acknowledged_at = optionalIsoDate(payload.delegated_acknowledged_at);
  }

  const { data, error } = await supabase.from("tasks").update(patch).eq("id", taskId).select("*").single();
  if (error) throw error;

  return data as Task;
}

export async function completeTask(context: ServerAuthContext, taskId: string) {
  const supabase = requireSupabase(context);

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function archiveTask(context: ServerAuthContext, taskId: string) {
  const supabase = requireSupabase(context);
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "archived" })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function reopenTask(context: ServerAuthContext, taskId: string) {
  const supabase = requireSupabase(context);
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "open", completed_at: null })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function delegateTask(context: ServerAuthContext, taskId: string, delegatedTo: string) {
  const supabase = requireSupabase(context);
  if (!delegatedTo) {
    throw new ApiError(400, "invalid_request", "delegated_to is required.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({
      delegated_to: delegatedTo,
      delegated_by: context.userId,
      delegated_acknowledged_at: null,
      status: "waiting"
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function acknowledgeDelegation(context: ServerAuthContext, taskId: string) {
  const supabase = requireSupabase(context);

  const { data, error } = await supabase
    .from("tasks")
    .update({
      delegated_acknowledged_at: new Date().toISOString(),
      status: "open"
    })
    .eq("id", taskId)
    .eq("delegated_to", context.userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function listDelegatedTasks(context: ServerAuthContext) {
  const supabase = requireSupabase(context);

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .not("delegated_to", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Task[];
}
