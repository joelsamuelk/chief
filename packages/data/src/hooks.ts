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

function toLocalDayKey(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useTasks(filter: "all" | "today" | "upcoming" | "completed" = "all") {
  return useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const all = await listTasks();
      const todayDate = toLocalDayKey(new Date());
      const taskDate = (task: Task) => {
        const value = task.due_at ?? task.start_at ?? task.end_at;
        return value ? toLocalDayKey(value) : null;
      };

      if (filter === "completed") {
        return all.filter((task) => task.status === "done" || task.status === "completed");
      }
      if (filter === "today") {
        return all.filter((task) => {
          const date = taskDate(task);
          return (task.status === "open" || task.status === "waiting") && date === todayDate;
        });
      }
      if (filter === "upcoming") {
        return all.filter((task) => {
          const date = taskDate(task);
          if (!date) return false;
          if (task.status === "done" || task.status === "completed" || task.status === "archived") return false;
          if (!todayDate) return false;
          return date > todayDate;
        });
      }

      return all.filter((task) => task.status !== "archived");
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
