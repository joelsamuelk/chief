import type { Event, EventInput, Task, TaskInput } from "@chief/types";
import { DEMO_USER_ID, seededEvents, seededTasks } from "./seed";

let inMemoryTasks = [...seededTasks];
let inMemoryEvents = [...seededEvents];

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrentUserId() {
  return DEMO_USER_ID;
}

export function listTasksLocal() {
  return [...inMemoryTasks].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function listEventsLocal() {
  return [...inMemoryEvents].sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export function createTaskLocal(input: TaskInput, userId: string): Task {
  const now = new Date().toISOString();
  const next: Task = {
    id: id(),
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    start_at: input.start_at ?? null,
    end_at: input.end_at ?? null,
    due_at: input.due_at ?? null,
    all_day: input.all_day ?? false,
    category: input.category ?? "work",
    priority: input.priority ?? "medium",
    status: input.status ?? "open",
    source_id: input.source_id ?? null,
    delegated_to: input.delegated_to ?? null,
    delegated_by: input.delegated_by ?? null,
    created_at: now,
    updated_at: now
  };
  inMemoryTasks = [next, ...inMemoryTasks];
  return next;
}

export function updateTaskLocal(taskId: string, patch: Partial<TaskInput>) {
  const now = new Date().toISOString();
  inMemoryTasks = inMemoryTasks.map((task) =>
    task.id === taskId ? { ...task, ...patch, updated_at: now } : task
  );
  return inMemoryTasks.find((task) => task.id === taskId) ?? null;
}

export function deleteTaskLocal(taskId: string) {
  inMemoryTasks = inMemoryTasks.filter((task) => task.id !== taskId);
}

export function createEventLocal(input: EventInput, userId: string): Event {
  const next: Event = {
    id: id(),
    user_id: userId,
    title: input.title,
    start_at: input.start_at,
    end_at: input.end_at,
    category: input.category,
    location: input.location ?? null,
    notes: input.notes ?? null,
    created_at: new Date().toISOString()
  };
  inMemoryEvents = [next, ...inMemoryEvents];
  return next;
}

export function updateEventLocal(eventId: string, patch: Partial<EventInput>) {
  inMemoryEvents = inMemoryEvents.map((event) => (event.id === eventId ? { ...event, ...patch } : event));
  return inMemoryEvents.find((event) => event.id === eventId) ?? null;
}

export function deleteEventLocal(eventId: string) {
  inMemoryEvents = inMemoryEvents.filter((event) => event.id !== eventId);
}
