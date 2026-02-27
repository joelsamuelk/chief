import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventInput, Task, TaskInput } from "@chief/types";
import {
  createEvent,
  createTask,
  deleteEvent,
  deleteTask,
  listEvents,
  listTasks,
  toggleTaskDone,
  updateEvent,
  updateTask
} from "./api";

export function useTasks(filter: "all" | "today" | "upcoming" | "completed" = "all") {
  return useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const all = await listTasks();
      const todayDate = new Date().toISOString().slice(0, 10);

      if (filter === "completed") return all.filter((task) => task.status === "done");
      if (filter === "today") {
        return all.filter((task) => {
          const start = task.start_at?.slice(0, 10);
          return task.status === "open" && start === todayDate;
        });
      }
      if (filter === "upcoming") {
        return all.filter((task) => {
          if (task.status === "done" || !task.start_at) return false;
          return task.start_at.slice(0, 10) > todayDate;
        });
      }

      return all;
    }
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
