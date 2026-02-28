import type { Decision, ExtractedItem, Task } from "@chief/types";
import type { AuthContext } from "@/lib/utils/auth";
import { ApiError } from "@/lib/server/errors";

export interface AcceptExtractedPayload {
  related_meeting_id?: string | null;
  task_ids?: string[];
}

export interface AcceptExtractedResult {
  item: ExtractedItem;
  created_task?: Task;
  created_decision?: Decision;
}

async function getQueueItem(context: AuthContext, id: string) {
  const { data, error } = await context.supabase
    .from("extracted_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ApiError(404, "queue_item_not_found", "Queue item not found.");
  return data as ExtractedItem;
}

function normalizeTaskPriority(value: string | null | undefined) {
  if (value === "high" || value === "low" || value === "medium" || value === "med") return value;
  return "medium";
}

export async function acceptExtractedItem(
  context: AuthContext,
  id: string,
  payload: AcceptExtractedPayload = {}
): Promise<AcceptExtractedResult> {
  const item = await getQueueItem(context, id);

  if (item.status === "accepted") {
    let createdTask: Task | undefined;
    let createdDecision: Decision | undefined;

    if (item.accepted_entity_type === "task" && item.accepted_entity_id) {
      const { data } = await context.supabase
        .from("tasks")
        .select("*")
        .eq("id", item.accepted_entity_id)
        .maybeSingle();
      if (data) createdTask = data as Task;
    }

    if (item.accepted_entity_type === "decision" && item.accepted_entity_id) {
      const { data } = await context.supabase
        .from("decisions")
        .select("*")
        .eq("id", item.accepted_entity_id)
        .maybeSingle();
      if (data) createdDecision = data as Decision;
    }

    return { item, created_task: createdTask, created_decision: createdDecision };
  }

  let acceptedEntityType: "task" | "decision" | null = null;
  let acceptedEntityId: string | null = null;
  let createdTask: Task | undefined;
  let createdDecision: Decision | undefined;

  if (item.kind === "task" || item.kind === "follow_up") {
    const { data, error } = await context.supabase
      .from("tasks")
      .insert({
        user_id: context.userId,
        org_id: item.org_id,
        title: item.title,
        description: item.body,
        due_at: item.due_at,
        source_id: item.source_id,
        priority: normalizeTaskPriority(item.priority),
        status: "open"
      })
      .select("*")
      .single();

    if (error) throw error;
    createdTask = data as Task;
    acceptedEntityType = "task";
    acceptedEntityId = createdTask.id;
  }

  if (item.kind === "decision") {
    const itemModel = (item.model ?? {}) as Record<string, unknown>;
    const { data, error } = await context.supabase
      .from("decisions")
      .insert({
        user_id: context.userId,
        org_id: item.org_id,
        title: item.title,
        context: item.body,
        owner: typeof itemModel.owner === "string" ? itemModel.owner : null,
        status: "proposed",
        related_meeting_id: payload.related_meeting_id ?? null,
        source_id: item.source_id
      })
      .select("*")
      .single();

    if (error) throw error;
    createdDecision = data as Decision;
    acceptedEntityType = "decision";
    acceptedEntityId = createdDecision.id;

    if (payload.task_ids && payload.task_ids.length > 0) {
      const rows = payload.task_ids.map((taskId) => ({ decision_id: createdDecision!.id, task_id: taskId }));
      const { error: linkError } = await context.supabase
        .from("decision_task_links")
        .upsert(rows, { onConflict: "decision_id,task_id", ignoreDuplicates: true });
      if (linkError) throw linkError;
    }
  }

  const acknowledgedModel =
    item.kind === "risk"
      ? {
          ...((item.model as Record<string, unknown> | null) ?? {}),
          acknowledged_at: new Date().toISOString()
        }
      : item.model;

  const { data: updated, error: updateError } = await context.supabase
    .from("extracted_items")
    .update({
      status: "accepted",
      accepted_entity_type: acceptedEntityType,
      accepted_entity_id: acceptedEntityId,
      snoozed_until: null,
      model: acknowledgedModel
    })
    .eq("id", item.id)
    .select("*")
    .single();

  if (updateError) throw updateError;

  return {
    item: updated as ExtractedItem,
    created_task: createdTask,
    created_decision: createdDecision
  };
}

export async function dismissExtractedItem(context: AuthContext, id: string) {
  const item = await getQueueItem(context, id);
  if (item.status === "dismissed") return item;

  const { data, error } = await context.supabase
    .from("extracted_items")
    .update({ status: "dismissed" })
    .eq("id", item.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ExtractedItem;
}

export async function snoozeExtractedItem(context: AuthContext, id: string, until: string) {
  const item = await getQueueItem(context, id);
  const nextUntil = new Date(until);
  if (Number.isNaN(nextUntil.getTime())) {
    throw new ApiError(400, "validation_failed", "until must be a valid datetime.");
  }

  const nextIso = nextUntil.toISOString();
  if (item.status === "snoozed" && item.snoozed_until === nextIso) {
    return item;
  }

  const { data, error } = await context.supabase
    .from("extracted_items")
    .update({
      status: "snoozed",
      snoozed_until: nextIso,
      snooze_count: (item.snooze_count ?? 0) + 1
    })
    .eq("id", item.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ExtractedItem;
}
