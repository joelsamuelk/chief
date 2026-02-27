import type { Event, EventInput, Task, TaskInput } from "@chief/types";
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

async function getUserIdFromAuth() {
  const supabase = getSupabaseClient();
  if (!supabase) return getCurrentUserId();

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? getCurrentUserId();
}

export async function listTasks() {
  const supabase = getSupabaseClient();
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
  const userId = await getUserIdFromAuth();

  if (!supabase) return createTaskLocal(input, userId);

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

  if (!supabase) {
    deleteTaskLocal(taskId);
    return;
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function toggleTaskDone(task: Task) {
  const status = task.status === "done" ? "open" : "done";
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
  const userId = await getUserIdFromAuth();

  if (!supabase) return createEventLocal(input, userId);

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
