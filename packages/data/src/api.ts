import type { Event, EventInput, Task, TaskInput } from "@chief/types";

function isWebRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

async function requestApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isWebRuntime()) {
    throw new Error("Local API requests require a browser runtime.");
  }

  const headers = new Headers(init.headers ?? {});
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

function mapTask(task: Record<string, unknown>): Task {
  return {
    id: String(task.id),
    user_id: String(task.user_id),
    org_id: (task.org_id as string | null | undefined) ?? null,
    title: String(task.title),
    description: (task.description as string | null | undefined) ?? null,
    due_at: (task.due_at as string | null | undefined) ?? null,
    start_at: (task.due_at as string | null | undefined) ?? null,
    end_at: null,
    all_day: false,
    category: "work",
    priority: ((task.priority as string | undefined) ?? "medium") as Task["priority"],
    status: ((task.status as string | undefined) ?? "open") as Task["status"],
    source_id: (task.source_id as string | null | undefined) ?? null,
    delegated_to: (task.delegated_to as string | null | undefined) ?? null,
    delegated_by: (task.delegated_by as string | null | undefined) ?? null,
    delegated_acknowledged_at: (task.delegated_acknowledged_at as string | null | undefined) ?? null,
    initiative_id: (task.initiative_id as string | null | undefined) ?? null,
    completed_at: (task.completed_at as string | null | undefined) ?? null,
    created_at: String(task.created_at),
    updated_at: (task.updated_at as string | undefined) ?? String(task.created_at)
  };
}

function mapMeetingToEvent(meeting: Record<string, unknown>): Event {
  return {
    id: String(meeting.id),
    user_id: String(meeting.user_id),
    org_id: (meeting.org_id as string | null | undefined) ?? null,
    title: String(meeting.title),
    start_at: String(meeting.start_time),
    end_at: String(meeting.end_time),
    location: null,
    notes: (meeting.notes as string | null | undefined) ?? null,
    category: "work",
    created_at: String(meeting.created_at)
  };
}

export async function listTasks(
  filter: "all" | "today" | "overdue" | "upcoming" | "waiting" | "completed" | "archived" = "all"
) {
  const payload = await requestApi<{ tasks?: Record<string, unknown>[] }>(`/api/tasks?filter=${filter}`, {
    method: "GET"
  });
  return (payload.tasks ?? []).map(mapTask);
}

export async function createTask(input: TaskInput) {
  const payload = await requestApi<{ task: Record<string, unknown> }>("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      description: input.description ?? null,
      due_at: input.due_at ?? input.start_at ?? null,
      priority: input.priority ?? "medium",
      status: input.status ?? "open",
      source_id: input.source_id ?? null,
      delegated_to: input.delegated_to ?? null,
      initiative_id: input.initiative_id ?? null
    })
  });
  return mapTask(payload.task);
}

export async function updateTask(taskId: string, patch: Partial<TaskInput>) {
  const payload = await requestApi<{ task: Record<string, unknown> }>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: patch.title,
      description: patch.description,
      due_at: patch.due_at ?? patch.start_at ?? null,
      priority: patch.priority,
      status: patch.status,
      initiative_id: patch.initiative_id
    })
  });
  return mapTask(payload.task);
}

export async function deleteTask(taskId: string) {
  await requestApi<{ ok: boolean }>("/api/tasks/update", {
    method: "POST",
    body: JSON.stringify({
      action: "delete",
      task_id: taskId
    })
  });
}

export async function toggleTaskDone(task: Task) {
  const isClosed = task.status === "done" || task.status === "completed" || task.status === "archived";
  const endpoint = isClosed ? "reopen" : "complete";
  const payload = await requestApi<{ task: Record<string, unknown> }>(`/api/tasks/${task.id}/${endpoint}`, {
    method: "POST"
  });
  return mapTask(payload.task);
}

export async function listEvents() {
  const payload = await requestApi<{ meetings?: Record<string, unknown>[] }>("/api/meetings", {
    method: "GET"
  });
  return (payload.meetings ?? []).map(mapMeetingToEvent);
}

export async function createEvent(input: EventInput) {
  const payload = await requestApi<{ meeting: Record<string, unknown> }>("/api/meetings", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      start_time: input.start_at,
      end_time: input.end_at,
      notes: input.notes ?? null
    })
  });
  return mapMeetingToEvent(payload.meeting);
}

export async function updateEvent(eventId: string, patch: Partial<EventInput>) {
  const payload = await requestApi<{ meeting: Record<string, unknown> }>(`/api/meetings/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: patch.title,
      start_time: patch.start_at,
      end_time: patch.end_at,
      notes: patch.notes
    })
  });
  return mapMeetingToEvent(payload.meeting);
}

export async function deleteEvent(eventId: string) {
  await requestApi<{ ok: boolean }>(`/api/meetings/${eventId}`, {
    method: "DELETE"
  });
}
