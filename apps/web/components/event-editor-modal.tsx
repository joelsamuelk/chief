"use client";

import { useCreateEvent, useUpdateEvent } from "@chief/data";
import type { Category, Event } from "@chief/types";
import { Chip, Modal } from "@chief/ui/web";
import { useEffect, useState } from "react";

const categories: Category[] = ["work", "personal", "health", "finance"];

function toInputValue(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

interface EventEditorModalProps {
  event: Event | null;
  open: boolean;
  draftStartAt?: string | null;
  draftEndAt?: string | null;
  onOpenChange: (open: boolean) => void;
}

export function EventEditorModal({
  event,
  open,
  draftStartAt,
  draftEndAt,
  onOpenChange
}: EventEditorModalProps) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [category, setCategory] = useState<Category>("work");

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setStartAt(toInputValue(event.start_at));
      setEndAt(toInputValue(event.end_at));
      setCategory(event.category);
      return;
    }

    if (draftStartAt && draftEndAt) {
      setTitle("New Event");
      setStartAt(toInputValue(draftStartAt));
      setEndAt(toInputValue(draftEndAt));
      setCategory("work");
      return;
    }

    const now = new Date();
    const next = new Date(now.getTime() + 30 * 60_000);
    setTitle("New Event");
    setStartAt(toInputValue(now.toISOString()));
    setEndAt(toInputValue(next.toISOString()));
    setCategory("work");
  }, [draftEndAt, draftStartAt, event]);

  async function save() {
    if (event) {
      await updateEvent.mutateAsync({
        eventId: event.id,
        patch: {
          title,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          category
        }
      });
    } else {
      await createEvent.mutateAsync({
        title,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        category
      });
    }

    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={event ? "Edit Event" : "Create Event"}>
      <input
        className="h-12 w-full rounded-input border border-divider bg-bg px-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          className="h-11 rounded-input border border-divider bg-bg px-3"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
        <input
          type="datetime-local"
          className="h-11 rounded-input border border-divider bg-bg px-3"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <Chip key={item} label={item} active={item === category} onClick={() => setCategory(item)} />
        ))}
      </div>
      <button type="button" onClick={save} className="h-12 w-full rounded-pill bg-chipActiveBg text-chipActiveText">
        {event ? "Save Event" : "Create Event"}
      </button>
    </Modal>
  );
}
