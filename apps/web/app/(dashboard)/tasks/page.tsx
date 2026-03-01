"use client";

import { useTasks, useToggleTaskDone } from "@chief/data";
import type { Task } from "@chief/types";
import { Card, CategoryDot, Chip, ListRow } from "@chief/ui/web";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskEditorModal } from "../../../components/task-editor-modal";
import { formatTimeRange } from "../../../lib/format";

type Filter = "all" | "today" | "overdue" | "upcoming" | "waiting" | "completed" | "archived";
type PageSize = 10 | 20 | 50;

function getStatusStyle(status: Task["status"]) {
  if (status === "done" || status === "completed") {
    return {
      label: "Completed",
      className: "border border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
    };
  }

  if (status === "waiting") {
    return {
      label: "Waiting",
      className: "border border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]"
    };
  }

  if (status === "archived") {
    return {
      label: "Archived",
      className: "border border-[#D0D5DD] bg-[#F2F4F7] text-[#475467]"
    };
  }

  return {
    label: "Open",
    className: "border border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]"
  };
}

export default function TasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: tasks = [] } = useTasks(filter);
  const toggleDone = useToggleTaskDone();

  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const pagedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tasks.slice(start, start + pageSize);
  }, [tasks, page, pageSize]);

  const rangeStart = tasks.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, tasks.length);

  const createNew = useCallback(() => {
    setSelectedTask(null);
    setEditorOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") !== "create") return;
    void createNew();
    router.replace(pathname || "/app/tasks");
  }, [createNew, pathname, router, searchParams]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

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
        <Chip
          label="All"
          active={filter === "all"}
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
        />
        <Chip
          label="Today"
          active={filter === "today"}
          onClick={() => {
            setFilter("today");
            setPage(1);
          }}
        />
        <Chip
          label="Upcoming"
          active={filter === "upcoming"}
          onClick={() => {
            setFilter("upcoming");
            setPage(1);
          }}
        />
        <Chip
          label="Overdue"
          active={filter === "overdue"}
          onClick={() => {
            setFilter("overdue");
            setPage(1);
          }}
        />
        <Chip
          label="Waiting"
          active={filter === "waiting"}
          onClick={() => {
            setFilter("waiting");
            setPage(1);
          }}
        />
        <Chip
          label="Completed"
          active={filter === "completed"}
          onClick={() => {
            setFilter("completed");
            setPage(1);
          }}
        />
        <Chip
          label="Archived"
          active={filter === "archived"}
          onClick={() => {
            setFilter("archived");
            setPage(1);
          }}
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-col gap-3 border-b border-divider/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-textSecondary">
            Showing {rangeStart}-{rangeEnd} of {tasks.length}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="tasks-page-size" className="text-[13px] text-textSecondary">
              Per page
            </label>
            <select
              id="tasks-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as PageSize);
                setPage(1);
              }}
              className="h-9 rounded-[10px] border border-divider bg-white px-2 text-[13px] text-textPrimary"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {pagedTasks.map((task) => {
            const statusStyle = getStatusStyle(task.status);
            return (
              <div key={task.id} className="rounded-cardMd border border-divider/80">
                <ListRow
                  left={<CategoryDot category={task.category ?? "work"} />}
                  title={task.title}
                  subtitle={formatTimeRange(task.due_at ?? task.start_at, task.end_at)}
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
                      className={`h-7 rounded-pill px-3 text-[12px] ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </button>
                  }
                />
              </div>
            );
          })}
          {pagedTasks.length === 0 ? (
            <div className="rounded-cardMd border border-divider/80 bg-bg px-4 py-5 text-[13px] text-textSecondary">
              No tasks found for this filter.
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-divider/80 pt-3">
          <p className="text-[13px] text-textSecondary">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="h-9 rounded-[10px] border border-divider px-3 text-[13px] text-textPrimary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="h-9 rounded-[10px] border border-divider px-3 text-[13px] text-textPrimary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      <TaskEditorModal task={selectedTask} open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
