export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return "All day";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const f = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return endDate ? `${f.format(startDate)} - ${f.format(endDate)}` : f.format(startDate);
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}
