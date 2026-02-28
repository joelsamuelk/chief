"use client";

import { useEvents } from "@chief/data";
import type { Event } from "@chief/types";
import { Card, CategoryDot, SegmentedControl } from "@chief/ui/web";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EventEditorModal } from "../../../components/event-editor-modal";
import { formatTimeRange } from "../../../lib/format";

type ViewMode = "Day" | "Week" | "Month";

const hours = Array.from({ length: 9 }, (_, i) => i + 9);

function eventDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<ViewMode>("Week");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const { data: events = [] } = useEvents();
  const today = new Date();

  useEffect(() => {
    if (searchParams.get("action") !== "create") return;
    setSelectedEvent(null);
    setEditorOpen(true);
    router.replace("/calendar");
  }, [router, searchParams]);

  const monthDates = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOffset = start.getDay();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const cells = [] as { date: Date; inMonth: boolean }[];

    for (let i = 0; i < firstDayOffset; i += 1) {
      cells.push({ date: new Date(today.getFullYear(), today.getMonth(), i - firstDayOffset + 1), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push({ date: new Date(today.getFullYear(), today.getMonth(), d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const day = cells.length - (firstDayOffset + daysInMonth) + 1;
      cells.push({ date: new Date(today.getFullYear(), today.getMonth() + 1, day), inMonth: false });
    }
    return cells;
  }, [today]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[28px] font-semibold sm:text-[30px]">Calendar</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <button
            type="button"
            className="h-11 rounded-pill bg-chipActiveBg px-4 text-[13px] font-medium text-chipActiveText"
            onClick={() => {
              setSelectedEvent(null);
              setEditorOpen(true);
            }}
          >
            + Event
          </button>
          <SegmentedControl
            value={mode}
            options={["Day", "Week", "Month"]}
            onChange={(next) => setMode(next as ViewMode)}
          />
        </div>
      </div>

      {mode !== "Month" ? (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <div className="relative min-w-[560px]">
              <div className="grid grid-cols-[80px_1fr]">
                <div className="space-y-4 pr-3 pt-10">
                  {hours.map((h) => (
                    <p key={h} className="h-16 text-[12px] font-medium text-textTertiary tabular-nums">
                      {h}:00
                    </p>
                  ))}
                </div>
                <div className="space-y-2">
                  {hours.map((h) => (
                    <div key={h} className="h-16 rounded-cardMd border border-divider/60" />
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute left-[106px] right-4 top-[90px] flex flex-col gap-2">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvent(event);
                      setEditorOpen(true);
                    }}
                    className="pointer-events-auto flex items-center gap-3 rounded-cardMd bg-surface p-3 text-left shadow-card transition hover:scale-[1.003]"
                  >
                    <CategoryDot category={event.category} />
                    <div>
                      <p className="text-[15px] font-semibold">{event.title}</p>
                      <p className="text-[12px] text-textSecondary">{formatTimeRange(event.start_at, event.end_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="mb-3 grid grid-cols-7 text-center text-[12px] font-medium text-textTertiary">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <p key={d}>{d}</p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthDates.map((item) => {
                  const key = eventDayKey(item.date);
                  const hasEvent = events.some((e) => e.start_at.slice(0, 10) === key);
                  const selected = key === today.toISOString().slice(0, 10);

                  return (
                    <div key={`${key}-${item.inMonth}`} className="min-h-20 rounded-cardMd bg-bg p-2">
                      <div className={`inline-grid h-8 w-8 place-items-center rounded-full text-[13px] ${selected ? "bg-chipActiveBg text-chipActiveText" : "text-textPrimary"}`}>
                        {item.date.getDate()}
                      </div>
                      {hasEvent ? <div className="mt-2 h-1.5 w-1.5 rounded-full bg-work" /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <EventEditorModal event={selectedEvent} open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
