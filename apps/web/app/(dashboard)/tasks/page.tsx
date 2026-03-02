"use client";

import { useTasks, useToggleTaskDone } from "@chief/data";
import { useQueryClient } from "@tanstack/react-query";
import type { Task } from "@chief/types";
import { Card, CategoryDot, Chip, ListRow } from "@chief/ui/web";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskEditorModal } from "../../../components/task-editor-modal";
import { formatTimeRange } from "../../../lib/format";

type Filter = "all" | "today" | "overdue" | "upcoming" | "waiting" | "completed" | "archived";
type PageSize = 10 | 20 | 50;

function isFilter(value: string | null): value is Filter {
  return value === "all" || value === "today" || value === "overdue" || value === "upcoming" || value === "waiting" || value === "completed" || value === "archived";
}

function parseSelectedTaskIds(input: string | null) {
  if (!input) return [] as string[];
  return Array.from(
    new Set(
      input
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );
}

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

function isClosedTask(task: Task) {
  return task.status === "done" || task.status === "completed" || task.status === "archived";
}

function isOverdueTask(task: Task) {
  if (!task.due_at || isClosedTask(task)) return false;
  const due = new Date(task.due_at);
  return Number.isFinite(due.getTime()) && due.getTime() < Date.now();
}

function isDelegationStuck(task: Task) {
  return task.status === "waiting" || (Boolean(task.delegated_to) && !task.delegated_acknowledged_at);
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState<"complete" | "archive" | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [lastActionSummary, setLastActionSummary] = useState<string | null>(null);
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
    const nextFilter = searchParams.get("filter");
    if (!isFilter(nextFilter) || nextFilter === filter) return;
    setFilter(nextFilter);
    setPage(1);
  }, [filter, searchParams]);

  useEffect(() => {
    const taskId = searchParams.get("task_id");
    if (!taskId) return;

    const matched = tasks.find((task) => task.id === taskId);
    if (!matched) return;

    setSelectedTask(matched);
    setEditorOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("task_id");
    const next = params.toString();
    router.replace(next.length > 0 ? `${pathname}?${next}` : pathname || "/app/tasks");
  }, [pathname, router, searchParams, tasks]);

  useEffect(() => {
    const selectedParam = searchParams.get("selected_task_ids");
    if (!selectedParam) return;

    const ids = parseSelectedTaskIds(selectedParam);
    if (ids.length === 0) return;

    setSelectedTaskIds(ids);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected_task_ids");
    const next = params.toString();
    router.replace(next.length > 0 ? `${pathname}?${next}` : pathname || "/app/tasks");
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setSelectedTaskIds((current) => current.filter((id) => tasks.some((task) => task.id === id)));
  }, [tasks]);

  useEffect(() => {
    if (!bulkMessage) return;
    const timeoutId = window.setTimeout(() => {
      setBulkMessage(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bulkMessage]);

  const selectedOnPageCount = pagedTasks.filter((task) => selectedTaskIds.includes(task.id)).length;
  const selectedFilteredCount = tasks.filter((task) => selectedTaskIds.includes(task.id)).length;
  const allFilteredSelected = tasks.length > 0 && selectedFilteredCount === tasks.length;
  const riskLinkedTaskIds = tasks
    .filter((task) => isOverdueTask(task) || isDelegationStuck(task))
    .map((task) => task.id);
  const selectedRiskLinkedCount = riskLinkedTaskIds.filter((id) => selectedTaskIds.includes(id)).length;
  const allRiskLinkedSelected = riskLinkedTaskIds.length > 0 && selectedRiskLinkedCount === riskLinkedTaskIds.length;

  async function runBulkAction(action: "complete" | "archive") {
    if (selectedTaskIds.length === 0) return;

    const targetIds =
      action === "complete"
        ? selectedTaskIds.filter((taskId) => {
            const task = tasks.find((item) => item.id === taskId);
            return task ? !isClosedTask(task) : true;
          })
        : selectedTaskIds;

    if (targetIds.length === 0) {
      setBulkMessage("No open tasks to complete.");
      setBulkError(null);
      setLastActionSummary("No-op: all selected tasks already closed.");
      return;
    }

    setBulkLoading(action);
    setBulkError(null);
    setBulkMessage(null);

    try {
      const results = await Promise.all(
        targetIds.map(async (taskId) => {
          const response = await fetch(`/api/tasks/${taskId}/${action}`, {
            method: "POST",
            headers: { "content-type": "application/json" }
          });

          if (!response.ok) {
            const payload = (await response.json()) as { error?: { message?: string } };
            throw new Error(payload.error?.message ?? `Unable to ${action} selected tasks.`);
          }

          if (action === "complete") {
            const payload = (await response.json()) as { changed?: boolean };
            return payload.changed !== false;
          }

          return true;
        })
      );

      const processedCount = results.filter(Boolean).length;

      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTaskIds([]);
      if (action === "complete") {
        const summary =
          processedCount > 0 ? `Completed ${processedCount} task(s).` : "All selected tasks were already completed.";
        setBulkMessage(summary);
        setLastActionSummary(summary);
      } else {
        const summary = `Archived ${processedCount} task(s).`;
        setBulkMessage(summary);
        setLastActionSummary(summary);
      }
    } catch (error) {
      setBulkError(error instanceof Error && error.message ? error.message : "Bulk action failed.");
    } finally {
      setBulkLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-semibold sm:text-[30px]">Tasks</h1>
          {lastActionSummary ? (
            <span className="rounded-pill bg-chipBg px-3 py-1 text-[11px] text-textSecondary">{lastActionSummary}</span>
          ) : null}
        </div>
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
          <div className="space-y-2">
            <p className="text-[13px] text-textSecondary">
              Showing {rangeStart}-{rangeEnd} of {tasks.length}
            </p>
            {selectedTaskIds.length > 0 ? (
              <p className="text-[12px] text-textSecondary">
                {selectedFilteredCount} selected{selectedFilteredCount < selectedTaskIds.length ? " (across filters)" : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={selectedOnPageCount === pagedTasks.length && pagedTasks.length > 0}
              aria-label={selectedOnPageCount === pagedTasks.length && pagedTasks.length > 0 ? "Clear selection for current page" : "Select all tasks on current page"}
              onClick={() => {
                const allSelected = selectedOnPageCount === pagedTasks.length && pagedTasks.length > 0;
                if (allSelected) {
                  setSelectedTaskIds((current) => current.filter((id) => !pagedTasks.some((task) => task.id === id)));
                  return;
                }
                setSelectedTaskIds((current) => {
                  const merged = new Set(current);
                  pagedTasks.forEach((task) => merged.add(task.id));
                  return Array.from(merged);
                });
              }}
              className="h-9 rounded-[10px] border border-divider px-3 text-[12px] text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              {selectedOnPageCount === pagedTasks.length && pagedTasks.length > 0 ? "Clear page" : "Select page"}
            </button>

            <button
              type="button"
              aria-pressed={allFilteredSelected}
              aria-label={allFilteredSelected ? "Clear selection for filtered tasks" : "Select all filtered tasks"}
              onClick={() => {
                if (allFilteredSelected) {
                  setSelectedTaskIds((current) => current.filter((id) => !tasks.some((task) => task.id === id)));
                  return;
                }
                setSelectedTaskIds((current) => {
                  const merged = new Set(current);
                  tasks.forEach((task) => merged.add(task.id));
                  return Array.from(merged);
                });
              }}
              className="h-9 rounded-[10px] border border-divider px-3 text-[12px] text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              {allFilteredSelected ? "Clear filtered" : "Select all filtered"}
            </button>

            <button
              type="button"
              disabled={riskLinkedTaskIds.length === 0}
              aria-pressed={allRiskLinkedSelected}
              aria-label={allRiskLinkedSelected ? "Clear risk linked task selection" : "Select risk linked tasks"}
              onClick={() => {
                if (allRiskLinkedSelected) {
                  setSelectedTaskIds((current) => current.filter((id) => !riskLinkedTaskIds.includes(id)));
                  return;
                }

                setSelectedTaskIds((current) => {
                  const merged = new Set(current);
                  riskLinkedTaskIds.forEach((id) => merged.add(id));
                  return Array.from(merged);
                });
              }}
              className="h-9 rounded-[10px] border border-divider px-3 text-[12px] text-textSecondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              {allRiskLinkedSelected ? "Clear risk-linked" : "Select risk-linked"}
            </button>

            <button
              type="button"
              disabled={selectedTaskIds.length === 0}
              onClick={() => setSelectedTaskIds([])}
              className="h-9 rounded-[10px] border border-divider px-3 text-[12px] text-textSecondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              Clear selection
            </button>

            <button
              type="button"
              disabled={selectedTaskIds.length === 0 || bulkLoading !== null}
              onClick={() => void runBulkAction("complete")}
              className="h-9 rounded-[10px] border border-[#ABEFC6] bg-[#ECFDF3] px-3 text-[12px] text-[#067647] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              {bulkLoading === "complete" ? "Completing..." : "Complete selected"}
            </button>

            <button
              type="button"
              disabled={selectedTaskIds.length === 0 || bulkLoading !== null}
              onClick={() => void runBulkAction("archive")}
              className="h-9 rounded-[10px] border border-divider bg-white px-3 text-[12px] text-textSecondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              {bulkLoading === "archive" ? "Archiving..." : "Archive selected"}
            </button>

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

        {bulkError ? (
          <p className="mb-3 text-[12px] text-[#b42318]" role="alert" aria-live="assertive">
            {bulkError}
          </p>
        ) : null}
        {bulkMessage ? (
          <p className="mb-3 text-[12px] text-[#106C2A]" role="status" aria-live="polite">
            {bulkMessage}
          </p>
        ) : null}

        <div className="space-y-2">
          {pagedTasks.map((task) => {
            const statusStyle = getStatusStyle(task.status);
            const isSelected = selectedTaskIds.includes(task.id);
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
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedTaskIds((current) => [...new Set([...current, task.id])]);
                            return;
                          }
                          setSelectedTaskIds((current) => current.filter((id) => id !== task.id));
                        }}
                        className="h-4 w-4"
                        aria-label={`Select ${task.title}`}
                      />
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
                    </div>
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
