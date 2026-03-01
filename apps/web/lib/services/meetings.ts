import { getDefaultContext, getRepos } from "../storage";
import type { CreateMeetingInput, UpdateMeetingInput } from "../storage";
import { createSource, processSource } from "./sources";
import { getTasks } from "./tasks";

export type MeetingFilter = "all" | "upcoming" | "past";

export function getMeetings(filter: MeetingFilter = "all") {
  const repos = getRepos();
  const context = getDefaultContext();
  const meetings = repos.meeting.list(context);
  const now = new Date();

  if (filter === "upcoming") {
    return meetings.filter((meeting) => new Date(meeting.start_time).getTime() >= now.getTime());
  }
  if (filter === "past") {
    return meetings.filter((meeting) => new Date(meeting.end_time).getTime() < now.getTime());
  }
  return meetings;
}

export function getMeeting(meetingId: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const meeting = repos.meeting.getById(context, meetingId);
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

export function createMeeting(payload: CreateMeetingInput) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.meeting.create(context, payload);
}

export function updateMeeting(meetingId: string, payload: UpdateMeetingInput) {
  const repos = getRepos();
  const context = getDefaultContext();
  const meeting = repos.meeting.update(context, meetingId, payload);
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

export function deleteMeeting(meetingId: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const ok = repos.meeting.delete(context, meetingId);
  if (!ok) throw new Error("Meeting not found.");
  return { ok: true };
}

export function runExtractionOnMeetingNotes(meetingId: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const meeting = repos.meeting.getById(context, meetingId);
  if (!meeting) throw new Error("Meeting not found.");
  if (!meeting.notes || meeting.notes.trim().length === 0) {
    throw new Error("Meeting notes are empty.");
  }

  const { source } = createSource({
    kind: "meeting",
    provider: "meeting_notes",
    external_id: `meeting-${meeting.id}`,
    raw_content: meeting.notes
  });

  const updatedMeeting = repos.meeting.update(context, meeting.id, { source_id: source.id });
  const extraction = processSource(source.id);
  return {
    meeting: updatedMeeting,
    source,
    extracted_items: extraction.created
  };
}

export function buildMeetingPreBrief(meetingId?: string) {
  const meetings = getMeetings("upcoming");
  const target = meetingId ? getMeeting(meetingId) : meetings[0] ?? null;
  if (!target) {
    return {
      meeting: null,
      linked_tasks: [],
      previous_notes: null
    };
  }

  const linkedTasks = getTasks("all").filter((task) => task.source_id === target.source_id);
  const previous = getMeetings("past")
    .filter((meeting) => meeting.title === target.title)
    .sort((a, b) => b.start_time.localeCompare(a.start_time))[0];

  return {
    meeting: target,
    linked_tasks: linkedTasks,
    previous_notes: previous?.notes ?? null
  };
}
