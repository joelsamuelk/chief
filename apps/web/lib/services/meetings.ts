import type { Meeting } from "@chief/types";
import type { AuthContext } from "@/lib/utils/auth";
import { endOfDay, startOfDay } from "@/lib/utils/dates";

export async function getMeetingsForDate(context: AuthContext, date = new Date()): Promise<Meeting[]> {
  const start = startOfDay(date).toISOString();
  const end = endOfDay(date).toISOString();

  const { data, error } = await context.supabase
    .from("meetings")
    .select("*")
    .gte("start_time", start)
    .lte("start_time", end)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Meeting[];
}

function parseMeetingTimeFromQuery(query: string) {
  const match = query.toLowerCase().match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const period = match[3];
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export async function getClosestMeetingForQuery(
  context: AuthContext,
  query: string,
  explicitTime?: string
): Promise<Meeting | null> {
  const meetings = await getMeetingsForDate(context);
  if (meetings.length === 0) return null;

  const explicit = explicitTime ? new Date(explicitTime) : null;
  const queryTime = parseMeetingTimeFromQuery(query);
  const target = explicit && !Number.isNaN(explicit.getTime()) ? explicit : queryTime;

  if (!target) return meetings[0] ?? null;

  return (
    meetings
      .map((meeting) => ({
        meeting,
        distance: Math.abs(new Date(meeting.start_time).getTime() - target.getTime())
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.meeting ?? null
  );
}
