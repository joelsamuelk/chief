"use client";

import { useEvents, useTasks } from "@chief/data";
import { Card } from "@chief/ui/web";
import { formatTimeRange } from "../lib/format";

export function RightRail() {
  const { data: events = [] } = useEvents();
  const { data: tasks = [] } = useTasks("today");

  return (
    <aside className="w-full space-y-4 xl:w-[320px]">
      <Card className="p-5">
        <p className="text-[14px] font-medium text-textSecondary">Quick actions</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="min-h-11 rounded-pill bg-chipBg text-[13px] font-medium">+ Task</button>
          <button className="min-h-11 rounded-pill bg-chipBg text-[13px] font-medium">+ Event</button>
        </div>
      </Card>
      <Card className="p-5">
        <p className="text-[14px] font-medium text-textSecondary">Today snapshot</p>
        <p className="mt-2 text-[28px] font-semibold tabular-nums">{events.length + tasks.length}</p>
        <p className="text-[13px] text-textSecondary">items planned</p>
      </Card>
      <Card className="p-5">
        <p className="text-[14px] font-medium text-textSecondary">Upcoming meetings</p>
        <div className="mt-3 space-y-3">
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="rounded-cardMd bg-bg p-3">
              <p className="text-[14px] font-semibold text-textPrimary">{event.title}</p>
              <p className="text-[12px] font-medium text-textSecondary">
                {formatTimeRange(event.start_at, event.end_at)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
}
