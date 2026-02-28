"use client";

import { useCreateTask, useDeleteTask, useUpdateTask } from "@chief/data";
import type { Priority, Task, TaskStatus } from "@chief/types";
import { Chip, Modal } from "@chief/ui/web";
import { useEffect, useState } from "react";

const priorities: Priority[] = ["low", "medium", "high"];
const statuses: TaskStatus[] = ["open", "waiting", "completed", "archived"];

function getStatusChip(status: TaskStatus, active: boolean) {
  if (status === "completed" || status === "done") {
    return active
      ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
      : "border-[#D0D5DD] bg-white text-[#475467]";
  }

  if (status === "waiting") {
    return active
      ? "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]"
      : "border-[#D0D5DD] bg-white text-[#475467]";
  }

  if (status === "archived") {
    return active
      ? "border-[#D0D5DD] bg-[#F2F4F7] text-[#344054]"
      : "border-[#D0D5DD] bg-white text-[#475467]";
  }

  return active
    ? "border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]"
    : "border-[#D0D5DD] bg-white text-[#475467]";
}

function toStatusLabel(status: TaskStatus) {
  if (status === "completed" || status === "done") return "Completed";
  if (status === "waiting") return "Waiting";
  if (status === "archived") return "Archived";
  return "Open";
}

function toErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    const candidate = (err as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
  }
  return fallback;
}

function toInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function TaskEditorModal({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>("open");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setDueAt(toInputValue(task.due_at ?? task.start_at ?? null));
      setPriority(task.priority === "med" ? "medium" : task.priority);
      setStatus(task.status === "done" ? "completed" : task.status);
      setError(null);
      return;
    }

    setTitle("");
    setDescription("");
    setDueAt(toInputValue(new Date().toISOString()));
    setPriority("medium");
    setStatus("open");
    setError(null);
  }, [task]);

  async function save() {
    setError(null);
    const cleanTitle = title.trim();
    if (cleanTitle.length === 0) {
      setError("Task title is required.");
      return;
    }

    try {
      if (task) {
        await updateTask.mutateAsync({
          taskId: task.id,
          patch: {
            title: cleanTitle,
            description: description.trim().length > 0 ? description.trim() : null,
            due_at: toIso(dueAt),
            priority,
            status
          }
        });
      } else {
        await createTask.mutateAsync({
          title: cleanTitle,
          description: description.trim().length > 0 ? description.trim() : null,
          due_at: toIso(dueAt),
          priority,
          status
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(toErrorMessage(err, "Unable to save task."));
    }
  }

  async function remove() {
    if (!task) return;
    setError(null);
    try {
      await deleteTask.mutateAsync(task.id);
      onOpenChange(false);
    } catch (err) {
      setError(toErrorMessage(err, "Unable to delete task."));
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Edit Task" : "Create Task"}
      footer={task ? (
        <button
          className="h-12 w-full rounded-pill bg-dangerBg text-[14px] font-medium text-dangerText disabled:cursor-not-allowed disabled:opacity-70"
          onClick={remove}
          type="button"
          disabled={deleteTask.isPending}
        >
          {deleteTask.isPending ? "Deleting..." : "Delete"}
        </button>
      ) : null}
    >
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-[12px] font-medium text-textSecondary">Task Title</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 w-full rounded-input border border-divider bg-bg px-4 text-[16px]"
          />
        </div>

        <div>
          <p className="mb-2 text-[12px] font-medium text-textSecondary">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-24 w-full rounded-input border border-divider bg-bg px-4 py-3 text-[15px]"
            placeholder="Add context for this task"
          />
        </div>

        <div className="rounded-cardMd border border-divider p-3">
          <p className="mb-2 text-[13px] font-medium text-textSecondary">Due</p>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="h-11 w-full rounded-input border border-divider bg-bg px-3 text-[13px]"
          />
        </div>

        <div className="rounded-cardMd border border-divider p-3">
          <p className="mb-2 text-[13px] font-medium text-textSecondary">Priority</p>
          <div className="flex flex-wrap gap-2">
            {priorities.map((item) => (
              <Chip key={item} label={item} active={item === priority} onClick={() => setPriority(item)} />
            ))}
          </div>
        </div>

        <div className="rounded-cardMd border border-divider p-3">
          <p className="mb-2 text-[13px] font-medium text-textSecondary">Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`min-h-11 rounded-pill border px-4 text-[13px] font-medium transition-all ${getStatusChip(item, item === status)}`}
              >
                {toStatusLabel(item)}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

        <button
          type="button"
          onClick={save}
          disabled={updateTask.isPending || createTask.isPending}
          className="h-12 w-full rounded-pill bg-chipActiveBg text-[14px] font-semibold text-chipActiveText disabled:cursor-not-allowed disabled:opacity-70"
        >
          {updateTask.isPending || createTask.isPending ? "Saving..." : task ? "Save Task" : "Create Task"}
        </button>
      </div>
    </Modal>
  );
}
