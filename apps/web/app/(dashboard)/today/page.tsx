"use client";

import { useEvents, useTasks } from "@chief/data";
import { Card, CategoryDot, ListRow, ProgressRing } from "@chief/ui/web";
import { useMemo } from "react";
import { formatTimeRange } from "../../../lib/format";

function toLocalDayKey(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TodayPage() {
  const { data: events = [] } = useEvents();
  const { data: tasks = [] } = useTasks("today");
  const eventsToday = useMemo(() => {
    const todayKey = toLocalDayKey(new Date());
    if (!todayKey) return [];
    return events.filter((event) => toLocalDayKey(event.start_at) === todayKey);
  }, [events]);
  const focusScore = Math.min(100, 40 + tasks.length * 10 + eventsToday.length * 8);

  return (
    <div className="space-y-4">
      <p className="text-[28px] font-semibold leading-[34px] sm:text-[30px] sm:leading-[36px]">Hey Joel</p>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[22px] font-semibold">Focus Score</p>
            <p className="text-[13px] font-medium text-textSecondary">Your executive rhythm today</p>
          </div>
          <div className="self-center sm:self-auto">
            <ProgressRing progress={focusScore} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-pill bg-chipBg px-4 py-2 text-[13px] font-medium">{eventsToday.length} meetings</span>
          <span className="rounded-pill bg-chipBg px-4 py-2 text-[13px] font-medium">{tasks.length} tasks</span>
          <span className="rounded-pill bg-chipBg px-4 py-2 text-[13px] font-medium">1 priority</span>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-[22px] font-semibold">Your Day</p>
        <div className="space-y-2">
          {eventsToday.map((event) => (
            <ListRow
              key={event.id}
              left={<CategoryDot category={event.category} />}
              title={event.title}
              subtitle={formatTimeRange(event.start_at, event.end_at)}
              right={<span className="text-[12px] text-textTertiary">Event</span>}
            />
          ))}
          {tasks.map((task) => (
            <ListRow
              key={task.id}
              left={<CategoryDot category={task.category ?? "work"} />}
              title={task.title}
              subtitle={formatTimeRange(task.due_at ?? task.start_at, task.end_at)}
              right={<span className="text-[12px] text-textTertiary">Task</span>}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
