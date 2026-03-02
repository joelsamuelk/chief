import { getDefaultContext, getRepos } from "../storage";
import type { DigestRecord } from "../storage";
import type { ProactivityLevel } from "../storage";
import { getTodaySnapshot } from "./today";

export function getNotificationPreferences() {
  const repos = getRepos();
  const context = getDefaultContext();
  const profile = repos.profile.get(context);
  return {
    proactivity_level: profile?.proactivity_level ?? "quiet",
    timezone: profile?.timezone ?? "UTC",
    work_start: profile?.work_start ?? "09:00",
    work_end: profile?.work_end ?? "17:30",
    onboarding_completed: profile?.onboarding_completed ?? false
  };
}

export function setProactivityLevel(level: ProactivityLevel) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.profile.upsert(context, {
    proactivity_level: level
  });
}

function resolveTimeZone(input: string | null | undefined) {
  if (!input || input.trim().length === 0) return "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: input }).format(new Date());
    return input;
  } catch {
    return "UTC";
  }
}

function parseClockToMinutes(value: string | null | undefined, fallbackMinutes: number) {
  if (!value) return fallbackMinutes;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallbackMinutes;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallbackMinutes;
  return hours * 60 + minutes;
}

function zonedParts(input: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(input);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const year = lookup.get("year") ?? "1970";
  const month = lookup.get("month") ?? "01";
  const day = lookup.get("day") ?? "01";
  const hour = Number(lookup.get("hour") ?? "0");
  const minute = Number(lookup.get("minute") ?? "0");
  return {
    dayKey: `${year}-${month}-${day}`,
    minuteOfDay: hour * 60 + minute
  };
}

function digestExistsForDay(digests: DigestRecord[], kind: DigestRecord["kind"], dayKey: string, timeZone: string) {
  return digests.some((digest) => {
    if (digest.kind !== kind) return false;
    const digestDay = zonedParts(new Date(digest.created_at), timeZone).dayKey;
    return digestDay === dayKey;
  });
}

export function runDigestScheduler(now = new Date()) {
  const repos = getRepos();
  const context = getDefaultContext();
  const profile = repos.profile.get(context);
  const level = profile?.proactivity_level ?? "quiet";

  if (!profile?.onboarding_completed || level === "reactive") {
    return {
      created: [] as DigestRecord[],
      proactivity_level: level
    };
  }

  const timeZone = resolveTimeZone(profile.timezone);
  const { dayKey, minuteOfDay } = zonedParts(now, timeZone);
  const workStart = parseClockToMinutes(profile.work_start, 9 * 60);
  const workEnd = parseClockToMinutes(profile.work_end, 17 * 60 + 30);
  const digests = repos.digest.list(context);
  const created: DigestRecord[] = [];

  if (minuteOfDay >= workStart && !digestExistsForDay(digests, "morning", dayKey, timeZone)) {
    created.push(generateMorningBrief().digest);
  }

  if (level === "strong" && minuteOfDay >= workEnd && !digestExistsForDay(digests, "eod", dayKey, timeZone)) {
    created.push(generateEodRecap().digest);
  }

  return {
    created,
    proactivity_level: level
  };
}

export function generateMorningBrief() {
  const repos = getRepos();
  const context = getDefaultContext();
  const snapshot = getTodaySnapshot();
  const content = {
    date: snapshot.date,
    priorities: snapshot.top_priorities,
    risks: snapshot.risks,
    queue_count: snapshot.queue_count,
    meetings: snapshot.meetings_today.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      start_time: meeting.start_time
    }))
  };
  const digest = repos.digest.create(context, "morning", content);
  return { digest, content };
}

export function generateEodRecap() {
  const repos = getRepos();
  const context = getDefaultContext();
  const tasks = repos.task.list(context);
  const completed = tasks.filter((task) => task.status === "completed");
  const outstanding = tasks.filter((task) => task.status === "open" || task.status === "waiting");
  const suggestion = outstanding
    .slice(0, 3)
    .map((task) => task.title)
    .join(", ");

  const content = {
    completed_count: completed.length,
    outstanding_count: outstanding.length,
    completed: completed.slice(0, 10).map((task) => ({ id: task.id, title: task.title })),
    outstanding: outstanding.slice(0, 10).map((task) => ({ id: task.id, title: task.title })),
    tomorrow_suggestion: suggestion || "No suggestion available."
  };
  const digest = repos.digest.create(context, "eod", content);
  return { digest, content };
}

export function listDigests() {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.digest.list(context);
}
