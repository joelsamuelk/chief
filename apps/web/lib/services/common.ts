import { ApiError } from "../server/errors";

export function normalizeTaskPriority(priority: string | null | undefined) {
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  if (priority === "medium") return "medium";
  if (priority === "med") return "med";
  return "medium";
}

export function normalizeTaskStatus(status: string | null | undefined) {
  if (status === "open") return "open";
  if (status === "waiting") return "waiting";
  if (status === "archived") return "archived";
  if (status === "completed" || status === "done") return "completed";
  return "open";
}

export function startOfDayIso(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function endOfDayIso(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function toDateOnly(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, "invalid_request", `${field} is required.`);
  }
  return value.trim();
}

export function optionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function optionalIsoDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new ApiError(400, "invalid_request", "Expected an ISO timestamp string.");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "invalid_request", `Invalid ISO timestamp: ${value}`);
  }

  return date.toISOString();
}

export function coerceBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}
