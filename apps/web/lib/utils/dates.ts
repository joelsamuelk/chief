export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function isValidDateString(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export function hoursSince(isoTime: string, now = new Date()) {
  return (now.getTime() - new Date(isoTime).getTime()) / (1000 * 60 * 60);
}

export function daysSince(isoTime: string, now = new Date()) {
  return hoursSince(isoTime, now) / 24;
}
