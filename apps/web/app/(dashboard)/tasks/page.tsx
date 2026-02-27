"use client";

import { useCreateTask, useTasks, useToggleTaskDone } from "@chief/data";
import type { Task } from "@chief/types";
import { Card, CategoryDot, Chip, ListRow } from "@chief/ui/web";
import { useState } from "react";
import { TaskEditorModal } from "../../../components/task-editor-modal";
import { formatTimeRange } from "../../../lib/format";

type Filter = "all" | "today" | "upcoming" | "completed";

export default function TasksPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: tasks = [] } = useTasks(filter);
  const createTask = useCreateTask();
  const toggleDone = useToggleTaskDone();

  async function createNew() {
    const task = await createTask.mutateAsync({
      title: "New task",
      all_day: false,
      category: "work",
      priority: "med",
      status: "open",
      start_at: null,
      end_at: null
    });
    setSelectedTask(task);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[28px] font-semibold sm:text-[30px]">Tasks</h1>
        <button
          type="button"
          onClick={createNew}
          className="h-11 rounded-pill bg-chipActiveBg px-4 text-[13px] font-medium text-chipActiveText"
        >
          + New Task
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        <Chip label="Today" active={filter === "today"} onClick={() => setFilter("today")} />
        <Chip label="Upcoming" active={filter === "upcoming"} onClick={() => setFilter("upcoming")} />
        <Chip label="Completed" active={filter === "completed"} onClick={() => setFilter("completed")} />
      </div>

      <Card className="p-4">
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-cardMd border border-divider/80">
              <ListRow
                left={<CategoryDot category={task.category} />}
                title={task.title}
                subtitle={formatTimeRange(task.start_at, task.end_at)}
                onClick={() => {
                  setSelectedTask(task);
                  setEditorOpen(true);
                }}
                right={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleDone.mutateAsync(task);
                    }}
                    className={`h-7 rounded-pill px-3 text-[12px] ${
                      task.status === "done" ? "bg-chipActiveBg text-chipActiveText" : "bg-chipBg text-textSecondary"
                    }`}
                  >
                    {task.status === "done" ? "Done" : "Open"}
                  </button>
                }
              />
            </div>
          ))}
        </div>
      </Card>

      <TaskEditorModal task={selectedTask} open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
