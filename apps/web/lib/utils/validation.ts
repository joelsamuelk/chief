import { z } from "next/dist/compiled/zod";
import { ApiError } from "../server/errors";

export { z };

export function parseWithSchema<T>(schema: { safeParse: (value: unknown) => { success: boolean; data: T; error?: { flatten: () => unknown } } }, payload: unknown, code = "validation_failed"): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(400, code, "Request validation failed.", parsed.error?.flatten());
  }

  return parsed.data;
}

export interface ExtractionEntry {
  title: string;
  description: string;
  due_at?: string;
  priority?: "low" | "medium" | "high";
  confidence: number;
  evidence?: string;
}

export interface ExtractionResult {
  summary: string;
  tasks: ExtractionEntry[];
  decisions: ExtractionEntry[];
  follow_ups: ExtractionEntry[];
  risks: ExtractionEntry[];
}

export interface SourceCreatePayload {
  kind: "email" | "meeting" | "shared_text" | "manual";
  provider: string;
  external_id?: string | null;
  raw_content: string;
  org_id?: string | null;
}

export interface ExtractRequestPayload {
  source_id: string;
}

export interface QueueAcceptPayload {
  id: string;
  related_meeting_id?: string | null;
  task_ids?: string[];
}

export interface QueueDismissPayload {
  id: string;
}

export interface QueueSnoozePayload {
  id: string;
  until: string;
}

export interface TasksQueryPayload {
  filter: "all" | "today" | "overdue" | "upcoming" | "waiting" | "completed";
}

export interface TaskUpdatePayload {
  action: "create" | "update" | "complete" | "archive" | "reopen" | "delegate";
  task_id?: string;
  delegated_to?: string;
  payload?: {
    title?: string;
    description?: string | null;
    due_at?: string | null;
    priority?: "low" | "medium" | "high" | "med";
    status?: "open" | "waiting" | "completed" | "done" | "archived";
    source_id?: string | null;
    org_id?: string | null;
  };
}

export interface AssistRequestPayload {
  query: string;
  meeting_time?: string;
}

export interface MemorySearchPayload {
  q: string;
  limit: number;
}

export interface InboxConnectPayload {
  provider: "google" | "microsoft" | "apple";
  action: "connect" | "disconnect";
  provider_user_id?: string;
  connection_id?: string;
}

export const extractionEntrySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  due_at: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().optional()
}).strict();

export const extractionResultSchema = z.object({
  summary: z.string(),
  tasks: z.array(extractionEntrySchema),
  decisions: z.array(extractionEntrySchema),
  follow_ups: z.array(extractionEntrySchema),
  risks: z.array(extractionEntrySchema)
}).strict();

export const sourceCreateSchema = z.object({
  kind: z.enum(["email", "meeting", "shared_text", "manual"]),
  provider: z.string().min(1),
  external_id: z.string().optional().nullable(),
  raw_content: z.string().min(1),
  org_id: z.string().uuid().optional().nullable()
}).strict();

export const extractRequestSchema = z.object({
  source_id: z.string().uuid()
});

export const queueAcceptSchema = z.object({
  id: z.string().uuid(),
  related_meeting_id: z.string().uuid().optional().nullable(),
  task_ids: z.array(z.string().uuid()).optional()
}).strict();

export const queueDismissSchema = z.object({
  id: z.string().uuid()
}).strict();

export const queueSnoozeSchema = z.object({
  id: z.string().uuid(),
  until: z.string()
}).strict();

export const tasksQuerySchema = z.object({
  filter: z.enum(["all", "today", "overdue", "upcoming", "waiting", "completed"]).default("all")
}).strict();

export const taskUpdateSchema = z.object({
  action: z.enum(["create", "update", "complete", "archive", "reopen", "delegate"]),
  task_id: z.string().uuid().optional(),
  delegated_to: z.string().uuid().optional(),
  payload: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      due_at: z.string().optional().nullable(),
      priority: z.enum(["low", "medium", "high", "med"]).optional(),
      status: z.enum(["open", "waiting", "completed", "done", "archived"]).optional(),
      source_id: z.string().uuid().optional().nullable(),
      org_id: z.string().uuid().optional().nullable()
    })
    .optional()
}).strict();

export const assistRequestSchema = z.object({
  query: z.string().min(1),
  meeting_time: z.string().optional()
}).strict();

export const memorySearchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
}).strict();

export const inboxConnectSchema = z.object({
  provider: z.enum(["google", "microsoft", "apple"]),
  action: z.enum(["connect", "disconnect"]),
  provider_user_id: z.string().optional(),
  connection_id: z.string().uuid().optional()
}).strict();
