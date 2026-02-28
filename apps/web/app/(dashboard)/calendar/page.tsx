"use client";

import { useEvents } from "@chief/data";
import type { Event } from "@chief/types";
import { Card, CategoryDot, SegmentedControl } from "@chief/ui/web";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EventEditorModal } from "../../../components/event-editor-modal";
import { formatTimeRange } from "../../../lib/format";

type ViewMode = "Day" | "Week" | "Month";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const weekdayLongLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const timelineStartHour = 7;
const timelineEndHour = 22;
const pixelsPerMinute = 1;
const timelineMinutes = (timelineEndHour - timelineStartHour) * 60;
const timelineHeight = timelineMinutes * pixelsPerMinute;
const dragSnapMinutes = 15;
const defaultDraftMinutes = 30;
const monthLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
});
const weekRangeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeLabelFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

interface NormalizedEvent {
  event: Event;
  start: Date;
  end: Date;
  dayKey: string;
  startsAtMinute: number;
  durationMinutes: number;
  allDay: boolean;
}

interface PositionedEvent extends NormalizedEvent {
  column: number;
  columnCount: number;
  span: number;
}

interface DraftRange {
  startAt: string;
  endAt: string;
}

interface DragState {
  day: Date;
  dayKey: string;
  startMinute: number;
  currentMinute: number;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  return addDays(normalized, -normalized.getDay());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function categoryClass(category: Event["category"]) {
  if (category === "work") return "border-l-[#E87D80] bg-[#FDF0F0]";
  if (category === "personal") return "border-l-[#5A9CE6] bg-[#EFF6FF]";
  if (category === "health") return "border-l-[#55B267] bg-[#EEFCEF]";
  return "border-l-[#C08A33] bg-[#FCF6EA]";
}

function formatMonthTitle(mode: ViewMode, date: Date) {
  if (mode === "Month") return monthLabelFormatter.format(date);
  if (mode === "Day") return dayLabelFormatter.format(date);
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return `${weekRangeFormatter.format(start)} – ${weekRangeFormatter.format(end)}`;
}

function shiftCursor(date: Date, mode: ViewMode, direction: -1 | 1) {
  if (mode === "Day") return addDays(date, direction);
  if (mode === "Week") return addDays(date, direction * 7);
  return addMonths(date, direction);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function normalizeEvent(event: Event): NormalizedEvent | null {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const durationMs = Math.max(defaultDraftMinutes * 60_000, end.getTime() - start.getTime());
  const startsAtMinute = start.getHours() * 60 + start.getMinutes();
  const durationMinutes = Math.max(defaultDraftMinutes, Math.round(durationMs / 60_000));
  const allDay = durationMinutes >= 23 * 60;

  return {
    event,
    start,
    end,
    dayKey: dayKey(start),
    startsAtMinute,
    durationMinutes,
    allDay
  };
}

function layoutTimedEvents(input: NormalizedEvent[]) {
  const sorted = [...input].sort(
    (a, b) => a.startsAtMinute - b.startsAtMinute || a.durationMinutes - b.durationMinutes
  );
  const output: PositionedEvent[] = [];
  let cluster: NormalizedEvent[] = [];
  let clusterEndMinute = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const columnEndMinutes: number[] = [];
    const placed: Array<NormalizedEvent & { column: number }> = [];

    for (const item of cluster) {
      const itemEndMinute = item.startsAtMinute + item.durationMinutes;
      let column = columnEndMinutes.findIndex((endMinute) => endMinute <= item.startsAtMinute);

      if (column < 0) {
        column = columnEndMinutes.length;
        columnEndMinutes.push(itemEndMinute);
      } else {
        columnEndMinutes[column] = itemEndMinute;
      }

      placed.push({ ...item, column });
    }

    const columnCount = Math.max(1, columnEndMinutes.length);

    for (const item of placed) {
      let span = 1;

      for (let candidate = item.column + 1; candidate < columnCount; candidate += 1) {
        const conflicts = placed.some((other) => {
          if (other.column !== candidate) return false;
          return intervalsOverlap(
            item.startsAtMinute,
            item.startsAtMinute + item.durationMinutes,
            other.startsAtMinute,
            other.startsAtMinute + other.durationMinutes
          );
        });
        if (conflicts) break;
        span += 1;
      }

      output.push({
        ...item,
        columnCount,
        span
      });
    }

    cluster = [];
    clusterEndMinute = -1;
  };

  for (const item of sorted) {
    const itemEndMinute = item.startsAtMinute + item.durationMinutes;
    if (cluster.length === 0 || item.startsAtMinute < clusterEndMinute) {
      cluster.push(item);
      clusterEndMinute = Math.max(clusterEndMinute, itemEndMinute);
      continue;
    }

    flushCluster();
    cluster.push(item);
    clusterEndMinute = itemEndMinute;
  }

  flushCluster();

  return output.sort((a, b) => a.startsAtMinute - b.startsAtMinute);
}

function buildDraftRange(day: Date, minuteA: number, minuteB: number): DraftRange {
  let startInView = Math.min(minuteA, minuteB);
  let endInView = Math.max(minuteA, minuteB);
  if (endInView - startInView < defaultDraftMinutes) {
    endInView = Math.min(timelineMinutes, startInView + defaultDraftMinutes);
  }
  if (endInView <= startInView) {
    startInView = Math.max(0, timelineMinutes - defaultDraftMinutes);
    endInView = timelineMinutes;
  }

  const startTotal = timelineStartHour * 60 + startInView;
  const endTotal = timelineStartHour * 60 + endInView;

  const startAt = new Date(day);
  startAt.setHours(Math.floor(startTotal / 60), startTotal % 60, 0, 0);

  const endAt = new Date(day);
  endAt.setHours(Math.floor(endTotal / 60), endTotal % 60, 0, 0);

  if (endAt <= startAt) {
    endAt.setTime(startAt.getTime() + defaultDraftMinutes * 60_000);
  }

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString()
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<ViewMode>("Week");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [draftRange, setDraftRange] = useState<DraftRange | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const dragBoundsRef = useRef<{ top: number; height: number } | null>(null);
  const { data: events = [] } = useEvents();
  const today = useMemo(() => new Date(), [nowTick]);

  function openCreateModal(range: DraftRange | null = null) {
    setSelectedEvent(null);
    setDraftRange(range);
    setEditorOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("action") !== "create") return;
    openCreateModal();
    router.replace("/calendar");
  }, [router, searchParams]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;
      if (editorOpen) return;

      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        openCreateModal();
        return;
      }
      if (key === "t") {
        event.preventDefault();
        setCursorDate(new Date());
        return;
      }
      if (key === "1") {
        event.preventDefault();
        setMode("Day");
        return;
      }
      if (key === "2") {
        event.preventDefault();
        setMode("Week");
        return;
      }
      if (key === "3") {
        event.preventDefault();
        setMode("Month");
        return;
      }
      if (key === "j" || key === "arrowright") {
        event.preventDefault();
        setCursorDate((current) => shiftCursor(current, mode, 1));
        return;
      }
      if (key === "k" || key === "arrowleft") {
        event.preventDefault();
        setCursorDate((current) => shiftCursor(current, mode, -1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorOpen, mode]);

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (event: MouseEvent) => {
      const bounds = dragBoundsRef.current;
      if (!bounds) return;
      const rawMinute = (event.clientY - bounds.top) / pixelsPerMinute;
      const snappedMinute = snapToStep(clamp(Math.round(rawMinute), 0, timelineMinutes), dragSnapMinutes);
      setDragState((current) => (current ? { ...current, currentMinute: snappedMinute } : null));
    };

    const finishDrag = (cancelled: boolean) => {
      setDragState((current) => {
        if (!current) return null;
        if (!cancelled) {
          const range = buildDraftRange(current.day, current.startMinute, current.currentMinute);
          openCreateModal(range);
        }
        return null;
      });
      dragBoundsRef.current = null;
    };

    const onMouseUp = () => finishDrag(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishDrag(true);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dragState]);

  const normalizedEvents = useMemo(
    () => events.map((event) => normalizeEvent(event)).filter((item): item is NormalizedEvent => item !== null),
    [events]
  );

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, NormalizedEvent[]>();
    for (const item of normalizedEvents) {
      const existing = grouped.get(item.dayKey) ?? [];
      existing.push(item);
      grouped.set(item.dayKey, existing);
    }
    for (const [, list] of grouped) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    return grouped;
  }, [normalizedEvents]);

  const visibleDays = useMemo(() => {
    if (mode === "Day") return [startOfDay(cursorDate)];
    const start = startOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [cursorDate, mode]);

  const monthDates = useMemo(() => {
    const monthStart = startOfMonth(cursorDate);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      return {
        date,
        inMonth: date.getMonth() === cursorDate.getMonth()
      };
    });
  }, [cursorDate]);

  const monthTitle = formatMonthTitle(mode, cursorDate);
  const hourLabels = Array.from(
    { length: timelineEndHour - timelineStartHour + 1 },
    (_, index) => timelineStartHour + index
  );
  const miniMonthDates = useMemo(() => monthDates.slice(0, 35), [monthDates]);
  const nowInViewMinute = today.getHours() * 60 + today.getMinutes() - timelineStartHour * 60;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="border border-black/10 p-4 shadow-none xl:sticky xl:top-4 xl:self-start">
          <button
            type="button"
            className="mb-4 h-11 w-full rounded-pill bg-chipActiveBg text-[13px] font-medium text-chipActiveText"
            onClick={() => openCreateModal()}
          >
            + Create
          </button>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-textPrimary">{monthLabelFormatter.format(cursorDate)}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-grid h-7 w-7 place-items-center rounded-full text-[14px] text-textSecondary transition hover:bg-chipBg"
                onClick={() => setCursorDate((current) => addMonths(current, -1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                className="inline-grid h-7 w-7 place-items-center rounded-full text-[14px] text-textSecondary transition hover:bg-chipBg"
                onClick={() => setCursorDate((current) => addMonths(current, 1))}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium text-textTertiary">
            {weekdayLabels.map((day) => (
              <span key={day}>{day.slice(0, 1)}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {miniMonthDates.map((item) => {
              const isToday = isSameDay(item.date, today);
              const isSelected = isSameDay(item.date, cursorDate);
              return (
                <button
                  key={`${dayKey(item.date)}-mini`}
                  type="button"
                  onClick={() => setCursorDate(item.date)}
                  className={`inline-grid h-8 w-8 place-items-center rounded-full text-[12px] transition ${
                    isSelected
                      ? "bg-chipActiveBg text-chipActiveText"
                      : item.inMonth
                        ? "text-textPrimary hover:bg-chipBg"
                        : "text-textTertiary hover:bg-chipBg"
                  }`}
                >
                  {isToday && !isSelected ? (
                    <span className="font-semibold text-[#1A73E8]">{item.date.getDate()}</span>
                  ) : (
                    item.date.getDate()
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-cardLg border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="h-10 rounded-pill border border-black/10 bg-white px-4 text-[13px] font-medium text-textPrimary transition hover:bg-chipBg"
                onClick={() => setCursorDate(new Date())}
              >
                Today
              </button>
              <div className="inline-flex items-center rounded-pill border border-black/10 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setCursorDate((current) => shiftCursor(current, mode, -1))}
                  className="inline-grid h-8 w-8 place-items-center rounded-full text-[16px] text-textSecondary transition hover:bg-chipBg"
                  aria-label="Previous period"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setCursorDate((current) => shiftCursor(current, mode, 1))}
                  className="inline-grid h-8 w-8 place-items-center rounded-full text-[16px] text-textSecondary transition hover:bg-chipBg"
                  aria-label="Next period"
                >
                  ›
                </button>
              </div>
              <h1 className="ml-1 text-[22px] font-semibold text-textPrimary sm:text-[26px]">{monthTitle}</h1>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SegmentedControl
                value={mode}
                options={["Day", "Week", "Month"]}
                onChange={(next) => setMode(next as ViewMode)}
              />
              <p className="text-[11px] text-textTertiary">Shortcuts: C create • T today • 1/2/3 view • J/K move</p>
            </div>
          </div>

          {mode === "Month" ? (
            <Card className="overflow-hidden border border-black/10 p-0 shadow-none">
              <div className="grid grid-cols-7 border-b border-divider bg-[#FCFCFD] text-center text-[12px] font-medium text-textSecondary">
                {weekdayLongLabels.map((day) => (
                  <div key={day} className="border-r border-divider py-3 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDates.map((item) => {
                  const key = dayKey(item.date);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const isToday = isSameDay(item.date, today);
                  return (
                    <div
                      key={`${key}-${item.inMonth}`}
                      className={`min-h-32 border-b border-r border-divider p-2 last:border-r-0 ${
                        item.inMonth ? "bg-white" : "bg-[#FAFAFB]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCursorDate(item.date);
                          setMode("Day");
                        }}
                        className={`inline-grid h-7 min-w-7 place-items-center rounded-full px-1 text-[12px] ${
                          isToday ? "bg-[#1A73E8] text-white" : item.inMonth ? "text-textPrimary" : "text-textTertiary"
                        }`}
                      >
                        {item.date.getDate()}
                      </button>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 2).map((itemEvent) => (
                          <button
                            key={itemEvent.event.id}
                            type="button"
                            onClick={() => {
                              setSelectedEvent(itemEvent.event);
                              setDraftRange(null);
                              setEditorOpen(true);
                            }}
                            className={`block w-full truncate rounded-[8px] border-l-4 px-2 py-1 text-left text-[11px] font-medium text-textPrimary ${categoryClass(itemEvent.event.category)}`}
                            title={`${itemEvent.event.title} • ${formatTimeRange(
                              itemEvent.event.start_at,
                              itemEvent.event.end_at
                            )}`}
                          >
                            {itemEvent.event.title}
                          </button>
                        ))}
                        {dayEvents.length > 2 ? (
                          <p className="px-1 text-[11px] font-medium text-textSecondary">
                            +{dayEvents.length - 2} more
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-black/10 p-0 shadow-none">
              <div
                className="grid border-b border-divider bg-[#FCFCFD]"
                style={{ gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(160px, 1fr))` }}
              >
                <div className="border-r border-divider py-3 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-textTertiary">
                  GMT
                </div>
                {visibleDays.map((day) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={dayKey(day)} className="border-r border-divider px-2 py-2 text-center last:border-r-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-textTertiary">
                        {weekdayLabels[day.getDay()]}
                      </p>
                      <span
                        className={`mt-1 inline-grid h-8 w-8 place-items-center rounded-full text-[14px] font-semibold ${
                          isToday ? "bg-[#1A73E8] text-white" : "text-textPrimary"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className="grid border-b border-divider bg-white"
                style={{ gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(160px, 1fr))` }}
              >
                <div className="border-r border-divider px-2 py-3 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-textTertiary">
                  All day
                </div>
                {visibleDays.map((day) => {
                  const list = (eventsByDay.get(dayKey(day)) ?? []).filter((item) => item.allDay);
                  return (
                    <div key={`${dayKey(day)}-all-day`} className="min-h-12 border-r border-divider p-2 last:border-r-0">
                      <div className="space-y-1">
                        {list.slice(0, 1).map((item) => (
                          <button
                            key={item.event.id}
                            type="button"
                            onClick={() => {
                              setSelectedEvent(item.event);
                              setDraftRange(null);
                              setEditorOpen(true);
                            }}
                            className={`block w-full truncate rounded-[8px] border-l-4 px-2 py-1 text-left text-[11px] font-medium text-textPrimary ${categoryClass(item.event.category)}`}
                          >
                            {item.event.title}
                          </button>
                        ))}
                        {list.length > 1 ? (
                          <span className="text-[11px] font-medium text-textSecondary">+{list.length - 1} more</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="max-h-[70vh] overflow-auto">
                <div
                  className="grid bg-white"
                  style={{ gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(160px, 1fr))` }}
                >
                  <div className="relative border-r border-divider" style={{ height: timelineHeight }}>
                    {hourLabels.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-divider/70"
                        style={{ top: (hour - timelineStartHour) * 60 * pixelsPerMinute }}
                      >
                        <span className="absolute -top-2 right-2 bg-white px-1 text-[10px] font-medium text-textTertiary">
                          {timeLabelFormatter.format(new Date(2024, 0, 1, hour))}
                        </span>
                      </div>
                    ))}
                  </div>
                  {visibleDays.map((day) => {
                    const key = dayKey(day);
                    const timedEvents = (eventsByDay.get(key) ?? []).filter((item) => !item.allDay);
                    const dayEvents = layoutTimedEvents(timedEvents);
                    const currentDayLineVisible =
                      isSameDay(day, today) && nowInViewMinute >= 0 && nowInViewMinute <= timelineMinutes;
                    const dayDragActive = dragState?.dayKey === key;
                    const dragTop = dayDragActive
                      ? Math.min(dragState.startMinute, dragState.currentMinute) * pixelsPerMinute
                      : 0;
                    const dragHeight = dayDragActive
                      ? Math.max(
                          defaultDraftMinutes * pixelsPerMinute,
                          Math.abs(dragState.currentMinute - dragState.startMinute) * pixelsPerMinute
                        )
                      : 0;

                    return (
                      <div
                        key={`${key}-timeline`}
                        className="relative border-r border-divider last:border-r-0"
                        style={{ height: timelineHeight }}
                        onMouseDown={(event) => {
                          if (event.button !== 0) return;
                          const target = event.target as HTMLElement;
                          if (target.closest("[data-calendar-event='true']")) return;
                          const rect = event.currentTarget.getBoundingClientRect();
                          dragBoundsRef.current = { top: rect.top, height: rect.height };
                          const rawMinute = (event.clientY - rect.top) / pixelsPerMinute;
                          const snappedMinute = snapToStep(
                            clamp(Math.round(rawMinute), 0, timelineMinutes),
                            dragSnapMinutes
                          );

                          setDragState({
                            day,
                            dayKey: key,
                            startMinute: snappedMinute,
                            currentMinute: snappedMinute
                          });
                        }}
                      >
                        {hourLabels.map((hour) => (
                          <div
                            key={`${key}-${hour}`}
                            className="absolute left-0 right-0 border-t border-divider/70"
                            style={{ top: (hour - timelineStartHour) * 60 * pixelsPerMinute }}
                          />
                        ))}

                        {dayDragActive ? (
                          <div
                            className="pointer-events-none absolute left-1 right-1 z-[12] rounded-[10px] border border-[#1A73E8]/60 bg-[#1A73E8]/15"
                            style={{ top: dragTop, height: dragHeight }}
                          />
                        ) : null}

                        {currentDayLineVisible ? (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-[14] border-t border-[#E53935]"
                            style={{ top: nowInViewMinute * pixelsPerMinute }}
                          >
                            <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-[#E53935]" />
                          </div>
                        ) : null}

                        {dayEvents.map((item) => {
                          const rawStart = item.startsAtMinute - timelineStartHour * 60;
                          const rawEnd = rawStart + item.durationMinutes;
                          if (rawEnd <= 0 || rawStart >= timelineMinutes) return null;

                          const startMinute = Math.max(0, rawStart);
                          const endMinute = Math.min(timelineMinutes, rawEnd);
                          const top = startMinute * pixelsPerMinute;
                          const height = Math.max(26, (endMinute - startMinute) * pixelsPerMinute);
                          const leftPercent = (item.column / item.columnCount) * 100;
                          const widthPercent = (item.span / item.columnCount) * 100;
                          const left = `calc(${leftPercent}% + 4px)`;
                          const width = `calc(${widthPercent}% - 8px)`;

                          return (
                            <button
                              key={item.event.id}
                              type="button"
                              data-calendar-event="true"
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={() => {
                                setSelectedEvent(item.event);
                                setDraftRange(null);
                                setEditorOpen(true);
                              }}
                              className={`absolute rounded-[10px] border-l-4 px-2 py-1 text-left shadow-sm transition hover:brightness-[0.99] ${categoryClass(item.event.category)}`}
                              style={{
                                top,
                                left,
                                width,
                                minHeight: 26,
                                height,
                                zIndex: 20 + item.column
                              }}
                            >
                              <div className="mb-1 flex items-center gap-1">
                                <CategoryDot category={item.event.category} />
                                <p className="truncate text-[11px] font-semibold text-textPrimary">{item.event.title}</p>
                              </div>
                              <p className="truncate text-[10px] font-medium text-textSecondary">
                                {formatTimeRange(item.event.start_at, item.event.end_at)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <EventEditorModal
        event={selectedEvent}
        open={editorOpen}
        draftStartAt={draftRange?.startAt ?? null}
        draftEndAt={draftRange?.endAt ?? null}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setSelectedEvent(null);
            setDraftRange(null);
          }
        }}
      />
    </div>
  );
}
