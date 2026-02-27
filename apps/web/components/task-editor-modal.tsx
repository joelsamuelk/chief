"use client";

import { useDeleteTask, useUpdateTask } from "@chief/data";
import type { Category, Task } from "@chief/types";
import { Chip, Modal, TimeCard, ToggleRow } from "@chief/ui/web";
import { useEffect, useMemo, useState } from "react";

const categories: Category[] = ["work", "personal", "health", "finance"];

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
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<Category>("work");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setStartAt(toInputValue(task.start_at));
    setEndAt(toInputValue(task.end_at));
    setAllDay(task.all_day);
    setCategory(task.category);
  }, [task]);

  const startLabel = useMemo(() => (startAt ? new Date(startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Start"), [startAt]);
  const endLabel = useMemo(() => (endAt ? new Date(endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "End"), [endAt]);

  const editingTask = task;
  if (!editingTask) return null;
  const taskId = editingTask.id;

  async function save() {
    await updateTask.mutateAsync({
      taskId,
      patch: {
        title,
        start_at: toIso(startAt),
        end_at: toIso(endAt),
        all_day: allDay,
        category
      }
    });
    onOpenChange(false);
  }

  async function remove() {
    await deleteTask.mutateAsync(taskId);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Task"
      footer={
        <button
          className="h-12 w-full rounded-pill bg-dangerBg text-[14px] font-medium text-dangerText"
          onClick={remove}
          type="button"
        >
          Delete
        </button>
      }
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
          <p className="mb-2 text-[12px] font-medium text-textSecondary">Time</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <TimeCard label="Start" value={startLabel} />
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="mt-2 h-11 w-full rounded-input border border-divider bg-bg px-3 text-[13px]"
              />
            </div>
            <div>
              <TimeCard label="End" value={endLabel} />
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="mt-2 h-11 w-full rounded-input border border-divider bg-bg px-3 text-[13px]"
              />
            </div>
          </div>
        </div>

        <ToggleRow label="All-day event" checked={allDay} onCheckedChange={setAllDay} />

        <div className="rounded-cardMd border border-divider p-3">
          <p className="mb-2 text-[13px] font-medium text-textSecondary">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Chip key={item} label={item} active={item === category} onClick={() => setCategory(item)} />
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-cardMd border border-divider p-3 text-[14px] text-textSecondary">
          <div className="flex items-center justify-between">
            <span>Alert</span>
            <span>15 minutes before</span>
          </div>
          <div className="flex items-center justify-between border-t border-divider pt-2">
            <span>Repeat</span>
            <span>Never</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            "Location",
            "Attendees",
            "Video Call",
            "Note"
          ].map((item) => (
            <button key={item} type="button" className="min-h-11 rounded-pill bg-chipBg px-4 text-[13px] font-medium text-textSecondary">
              {item}
            </button>
          ))}
        </div>

        <button type="button" onClick={save} className="h-12 w-full rounded-pill bg-chipActiveBg text-[14px] font-semibold text-chipActiveText">
          Save
        </button>
      </div>
    </Modal>
  );
}
