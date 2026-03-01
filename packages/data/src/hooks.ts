import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventInput, Task, TaskInput } from "@chief/types";
import { createEvent, createTask, deleteEvent, deleteTask, listEvents, listTasks, toggleTaskDone, updateEvent, updateTask } from "./api";

export function useTasks(
  filter: "all" | "today" | "overdue" | "upcoming" | "waiting" | "completed" | "archived" = "all"
) {
  return useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => listTasks(filter)
  });
}

export function useEvents() {
  return useQuery({ queryKey: ["events"], queryFn: listEvents });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    }
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<TaskInput> }) => updateTask(taskId, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    }
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    }
  });
}

export function useToggleTaskDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => toggleTaskDone(task),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    }
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventInput) => createEvent(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["events"] });
    }
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, patch }: { eventId: string; patch: Partial<EventInput> }) =>
      updateEvent(eventId, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["events"] });
    }
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["events"] });
    }
  });
}
