"use client";

import { Card, Chip } from "@chief/ui/web";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatTimeRange } from "@/lib/format";

type MeetingFilter = "all" | "upcoming" | "past";

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  source_id: string | null;
}

interface PreBrief {
  meeting: Meeting | null;
  linked_tasks: Array<{ id: string; title: string; status: string }>;
  previous_notes: string | null;
}

function toInputValue(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function MeetingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<MeetingFilter>("upcoming");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prebrief, setPrebrief] = useState<PreBrief | null>(null);

  const [title, setTitle] = useState("Leadership review");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 60 * 1000);
    setStartTime(toInputValue(now.toISOString()));
    setEndTime(toInputValue(end.toISOString()));
  }, []);

  async function loadMeetings(nextFilter: MeetingFilter) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/meetings?filter=${nextFilter}`, { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { meetings?: Meeting[]; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to load meetings.");
      }
      setMeetings(payload.meetings ?? []);
      if (!selectedId && payload.meetings && payload.meetings.length > 0) {
        setSelectedId(payload.meetings[0].id);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to load meetings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMeetings(filter);
  }, [filter]);

  useEffect(() => {
    if (searchParams.get("action") !== "create") return;
    const anchor = document.getElementById("meeting-create-form");
    anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
    router.replace("/app/meetings");
  }, [router, searchParams]);

  useEffect(() => {
    let active = true;

    async function loadPrebrief() {
      if (!selectedId) {
        setPrebrief(null);
        return;
      }

      try {
        const response = await fetch(`/api/meetings/prebrief?meeting_id=${selectedId}`, {
          method: "GET",
          cache: "no-store"
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { prebrief?: PreBrief };
        if (active) setPrebrief(payload.prebrief ?? null);
      } catch {
        if (active) setPrebrief(null);
      }
    }

    void loadPrebrief();
    return () => {
      active = false;
    };
  }, [selectedId, meetings]);

  async function createMeeting() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          notes: notes.trim().length > 0 ? notes.trim() : null,
          attendees: []
        })
      });
      const payload = (await response.json()) as { meeting?: Meeting; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to create meeting.");
      }

      if (payload.meeting?.id) {
        setSelectedId(payload.meeting.id);
      }

      await loadMeetings(filter);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to create meeting.");
    } finally {
      setSaving(false);
    }
  }

  async function extractNotes(meetingId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/extract`, { method: "POST" });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to run extraction.");
      }
      await loadMeetings(filter);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to run extraction.");
    }
  }

  const selectedMeeting = useMemo(() => meetings.find((meeting) => meeting.id === selectedId) ?? null, [meetings, selectedId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold">Meetings</h1>
          <p className="text-[13px] text-textSecondary">Context, notes, and extraction workflow.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label="Upcoming" active={filter === "upcoming"} onClick={() => setFilter("upcoming")} />
        <Chip label="Past" active={filter === "past"} onClick={() => setFilter("past")} />
        <Chip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
      </div>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border border-black/10 p-4 shadow-none">
          <p className="mb-3 text-[16px] font-semibold">Meeting list</p>
          <div className="space-y-2">
            {loading ? (
              <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">Loading meetings...</div>
            ) : null}
            {!loading && meetings.length === 0 ? (
              <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">No meetings for this filter.</div>
            ) : null}
            {meetings.map((meeting) => (
              <button
                key={meeting.id}
                type="button"
                onClick={() => setSelectedId(meeting.id)}
                className={`w-full rounded-[12px] border p-3 text-left ${
                  selectedId === meeting.id ? "border-[#111418] bg-white" : "border-black/10 bg-[#FAFAFB]"
                }`}
              >
                <p className="text-[14px] font-semibold text-textPrimary">{meeting.title}</p>
                <p className="text-[12px] text-textSecondary">{formatTimeRange(meeting.start_time, meeting.end_time)}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border border-black/10 p-4 shadow-none">
            <p className="mb-3 text-[16px] font-semibold">Meeting detail</p>
            {selectedMeeting ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[13px] font-semibold text-textPrimary">{selectedMeeting.title}</p>
                  <p className="text-[12px] text-textSecondary">{formatTimeRange(selectedMeeting.start_time, selectedMeeting.end_time)}</p>
                </div>
                <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
                  {selectedMeeting.notes || "No notes yet."}
                </div>
                <button
                  type="button"
                  onClick={() => void extractNotes(selectedMeeting.id)}
                  className="h-9 rounded-pill bg-chipActiveBg px-4 text-[12px] font-medium text-chipActiveText"
                >
                  Run extraction on notes
                </button>
              </div>
            ) : (
              <p className="text-[13px] text-textSecondary">Select a meeting to view detail.</p>
            )}
          </Card>

          <Card className="border border-black/10 p-4 shadow-none">
            <p className="mb-3 text-[16px] font-semibold">Pre-brief</p>
            {!prebrief?.meeting ? (
              <p className="text-[13px] text-textSecondary">No pre-brief available.</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
                  <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-textSecondary">Linked tasks</p>
                  <p className="mt-1 text-[13px] text-textPrimary">{prebrief.linked_tasks.length} linked task(s)</p>
                </div>
                {prebrief.previous_notes ? (
                  <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
                    {prebrief.previous_notes}
                  </div>
                ) : (
                  <p className="text-[13px] text-textSecondary">No previous notes found for this series.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div id="meeting-create-form">
        <Card className="border border-black/10 p-4 shadow-none">
          <p className="mb-3 text-[16px] font-semibold">Create meeting</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-textSecondary">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 h-10 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[13px] text-textPrimary"
              />
            </label>
            <label className="text-[12px] text-textSecondary">
              Start
              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-1 h-10 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[13px] text-textPrimary"
              />
            </label>
            <label className="text-[12px] text-textSecondary">
              End
              <input
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-1 h-10 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[13px] text-textPrimary"
              />
            </label>
            <label className="text-[12px] text-textSecondary sm:col-span-2">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[13px] text-textPrimary"
                placeholder="Capture structured notes."
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void createMeeting()}
            disabled={saving}
            className="mt-3 h-10 rounded-[10px] bg-[#111418] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            {saving ? "Saving..." : "Create meeting"}
          </button>
        </Card>
      </div>
    </div>
  );
}
