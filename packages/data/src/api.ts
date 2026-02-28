import type { Event, EventInput, Task, TaskInput } from "@chief/types";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";
import {
  createEventLocal,
  createTaskLocal,
  deleteEventLocal,
  deleteTaskLocal,
  getCurrentUserId,
  listEventsLocal,
  listTasksLocal,
  updateEventLocal,
  updateTaskLocal
} from "./store";

interface AuthState {
  userId: string;
  user: User | null;
}

function isWebRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

async function getApiAccessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

async function requestWebApi<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

  if (!response.ok) {
    const message =
      (payload.error as { message?: string } | undefined)?.message ??
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function deriveProfileName(user: User | null) {
  if (!user) return "Chief User";

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (fullName.length > 0) return fullName;

  const name = typeof metadata.name === "string" ? metadata.name.trim() : "";
  if (name.length > 0) return name;

  const email = user.email ?? "";
  if (email.includes("@")) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
  }

  return "Chief User";
}

async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      userId: getCurrentUserId(),
      user: null
    };
  }

  const { data } = await supabase.auth.getUser();
  return {
    userId: data.user?.id ?? getCurrentUserId(),
    user: data.user ?? null
  };
}

async function ensureProfileRecord(userId: string, user: User | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { error: insertError } = await supabase.from("profiles").insert({
    id: userId,
    name: deriveProfileName(user),
    timezone
  });

  if (insertError) throw insertError;
}

async function getUserIdFromAuth() {
  const { userId } = await getAuthState();
  return userId;
}

export async function listTasks() {
  const supabase = getSupabaseClient();

  if (supabase && isWebRuntime()) {
    const accessToken = await getApiAccessToken();
    if (!accessToken) return [];
    const payload = await requestWebApi<{ tasks: Task[] }>("/api/tasks?filter=all", { method: "GET" }, accessToken);
    return payload.tasks ?? [];
  }

  const userId = await getUserIdFromAuth();

  if (!supabase) return listTasksLocal();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(input: TaskInput) {
  const supabase = getSupabaseClient();
  const { userId, user } = await getAuthState();

  if (supabase && isWebRuntime()) {
    const accessToken = await getApiAccessToken();
    if (!accessToken) {
      throw new Error("Authentication session is not ready. Refresh and try again.");
    }
    const payload = await requestWebApi<{ task: Task }>(
      "/api/tasks",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      accessToken
    );
    return payload.task;
  }

  if (!supabase) return createTaskLocal(input, userId);
  await ensureProfileRecord(userId, user);

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function updateTask(taskId: string, patch: Partial<TaskInput>) {
  const supabase = getSupabaseClient();

  if (supabase && isWebRuntime()) {
    const accessToken = await getApiAccessToken();
    if (!accessToken) {
      throw new Error("Authentication session is not ready. Refresh and try again.");
    }
    const payload = await requestWebApi<{ task: Task }>(
      "/api/tasks/update",
      {
        method: "POST",
        body: JSON.stringify({
          action: "update",
          task_id: taskId,
          payload: patch
        })
      },
      accessToken
    );
    return payload.task;
  }

  if (!supabase) {
    const updated = updateTaskLocal(taskId, patch);
    if (!updated) throw new Error("Task not found");
    return updated;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(taskId: string) {
  const supabase = getSupabaseClient();

  if (supabase && isWebRuntime()) {
    const accessToken = await getApiAccessToken();
    if (!accessToken) {
      throw new Error("Authentication session is not ready. Refresh and try again.");
    }
    await requestWebApi<{ task: Task }>(
      "/api/tasks/update",
      {
        method: "POST",
        body: JSON.stringify({
          action: "archive",
          task_id: taskId
        })
      },
      accessToken
    );
    return;
  }

  if (!supabase) {
    deleteTaskLocal(taskId);
    return;
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function toggleTaskDone(task: Task) {
  const isClosed = task.status === "done" || task.status === "completed" || task.status === "archived";
  const supabase = getSupabaseClient();

  if (supabase && isWebRuntime()) {
    const accessToken = await getApiAccessToken();
    if (!accessToken) {
      throw new Error("Authentication session is not ready. Refresh and try again.");
    }
    const payload = await requestWebApi<{ task: Task }>(
      "/api/tasks/update",
      {
        method: "POST",
        body: JSON.stringify({
          action: isClosed ? "reopen" : "complete",
          task_id: task.id
        })
      },
      accessToken
    );
    return payload.task;
  }

  const status = isClosed ? "open" : "completed";
  return updateTask(task.id, { status });
}

export async function listEvents() {
  const supabase = getSupabaseClient();
  const userId = await getUserIdFromAuth();

  if (!supabase) return listEventsLocal();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .order("start_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Event[];
}

export async function createEvent(input: EventInput) {
  const supabase = getSupabaseClient();
  const { userId, user } = await getAuthState();

  if (!supabase) return createEventLocal(input, userId);
  await ensureProfileRecord(userId, user);

  const { data, error } = await supabase
    .from("events")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data as Event;
}

export async function updateEvent(eventId: string, patch: Partial<EventInput>) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const updated = updateEventLocal(eventId, patch);
    if (!updated) throw new Error("Event not found");
    return updated;
  }

  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(eventId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    deleteEventLocal(eventId);
    return;
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;
}
