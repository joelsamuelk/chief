import type { Task } from "@chief/types";
import type { AuthContext } from "@/lib/utils/auth";
import { ApiError } from "@/lib/server/errors";
import { endOfDay, startOfDay } from "@/lib/utils/dates";

export type TaskFilter = "all" | "today" | "overdue" | "upcoming" | "waiting" | "completed";

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: "low" | "medium" | "high" | "med";
  status?: "open" | "waiting" | "completed" | "done" | "archived";
  source_id?: string | null;
  org_id?: string | null;
}

function normalizePriority(value: string | null | undefined) {
  if (value === "low" || value === "medium" || value === "high" || value === "med") return value;
  return "medium";
}

function normalizeStatus(value: string | null | undefined) {
  if (value === "open" || value === "waiting" || value === "completed" || value === "done" || value === "archived") {
    return value;
  }
  return "open";
}

function parseIsoOrNull(value: string | null | undefined) {
  if (!value || value.trim().length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "validation_failed", `Invalid datetime value: ${value}`);
  }
  return parsed.toISOString();
}

function deriveProfileName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  if (!user) return "Chief User";

  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0
      ? metadata.full_name.trim()
      : typeof metadata.name === "string" && metadata.name.trim().length > 0
        ? metadata.name.trim()
        : null;

  if (fullName) return fullName;
  return user.email?.split("@")[0] || "Chief User";
}

async function ensureProfileExists(context: AuthContext) {
  const { error } = await context.supabase.from("profiles").upsert(
    {
      id: context.userId,
      name: deriveProfileName(null),
      timezone: "UTC"
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (error) throw error;
}

function isCompleted(task: Task) {
  return task.status === "completed" || task.status === "done" || task.status === "archived";
}

export async function createTask(context: AuthContext, input: TaskCreateInput): Promise<Task> {
  const title = input.title.trim();
  if (title.length === 0) throw new ApiError(400, "validation_failed", "title is required.");
  await ensureProfileExists(context);

  const { data, error } = await context.supabase
    .from("tasks")
    .insert({
      user_id: context.userId,
      org_id: input.org_id ?? context.orgId,
      title,
      description: input.description ?? null,
      due_at: parseIsoOrNull(input.due_at),
      priority: normalizePriority(input.priority),
      status: normalizeStatus(input.status),
      source_id: input.source_id ?? null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function completeTask(context: AuthContext, taskId: string) {
  const { data, error } = await context.supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function archiveTask(context: AuthContext, taskId: string) {
  const { data, error } = await context.supabase
    .from("tasks")
    .update({ status: "archived" })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function reopenTask(context: AuthContext, taskId: string) {
  const { data, error } = await context.supabase
    .from("tasks")
    .update({ status: "open", completed_at: null })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function delegateTask(context: AuthContext, taskId: string, delegatedTo: string) {
  if (!delegatedTo) throw new ApiError(400, "validation_failed", "delegated_to is required.");

  const { data, error } = await context.supabase
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

export async function updateTask(
  context: AuthContext,
  taskId: string,
  patch: Partial<Omit<TaskCreateInput, "title"> & { title: string }>
) {
  const nextPatch: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title.length === 0) throw new ApiError(400, "validation_failed", "title is required.");
    nextPatch.title = title;
  }
  if (patch.description !== undefined) nextPatch.description = patch.description;
  if (patch.due_at !== undefined) nextPatch.due_at = parseIsoOrNull(patch.due_at);
  if (patch.priority !== undefined) nextPatch.priority = normalizePriority(patch.priority);
  if (patch.status !== undefined) nextPatch.status = normalizeStatus(patch.status);
  if (patch.source_id !== undefined) nextPatch.source_id = patch.source_id;

  const { data, error } = await context.supabase.from("tasks").update(nextPatch).eq("id", taskId).select("*").single();
  if (error) throw error;
  return data as Task;
}

function dueAt(task: Task) {
  return task.due_at ?? task.end_at ?? task.start_at;
}

function isOverdue(task: Task, now = new Date()) {
  const due = dueAt(task);
  if (!due) return false;
  if (task.status !== "open") return false;
  return new Date(due).getTime() < now.getTime();
}

export async function getTasks(context: AuthContext, filter: TaskFilter): Promise<Task[]> {
  const { data, error } = await context.supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  const tasks = (data ?? []) as Task[];
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();

  if (filter === "all") return tasks;
  if (filter === "waiting") return tasks.filter((task) => task.status === "waiting");
  if (filter === "completed") return tasks.filter((task) => task.status === "completed" || task.status === "done");
  if (filter === "overdue") return tasks.filter((task) => isOverdue(task, now));

  if (filter === "today") {
    return tasks.filter((task) => {
      if (isCompleted(task)) return false;
      const due = dueAt(task);
      if (!due) return false;
      const ms = new Date(due).getTime();
      return ms >= todayStart && ms <= todayEnd;
    });
  }

  return tasks.filter((task) => {
    if (isCompleted(task)) return false;
    const due = dueAt(task);
    if (!due) return false;
    return new Date(due).getTime() > todayEnd;
  });
}
