import type { ServerAuthContext } from "@chief/data/server";
import type { Decision, ExtractedItem, Task } from "@chief/types";
import { ApiError } from "../server/errors";
import { requireSupabase } from "../server/http";
import { normalizeTaskPriority, optionalIsoDate } from "./common";

export interface AcceptQueueResult {
  item: ExtractedItem;
  created_task?: Task;
  created_decision?: Decision;
}

async function getItem(context: ServerAuthContext, itemId: string) {
  const supabase = requireSupabase(context);
  const { data, error } = await supabase
    .from("extracted_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ApiError(404, "queue_item_not_found", "Queue item not found.");

  return data as ExtractedItem;
}

export async function acceptQueueItem(
  context: ServerAuthContext,
  itemId: string,
  payload?: { related_meeting_id?: string | null; task_ids?: string[] }
): Promise<AcceptQueueResult> {
  const supabase = requireSupabase(context);
  const item = await getItem(context, itemId);

  if (item.status === "accepted") {
    if (item.accepted_entity_type === "task" && item.accepted_entity_id) {
      const { data } = await supabase.from("tasks").select("*").eq("id", item.accepted_entity_id).maybeSingle();
      return { item, created_task: (data as Task | null) ?? undefined };
    }

    if (item.accepted_entity_type === "decision" && item.accepted_entity_id) {
      const { data } = await supabase
        .from("decisions")
        .select("*")
        .eq("id", item.accepted_entity_id)
        .maybeSingle();
      return { item, created_decision: (data as Decision | null) ?? undefined };
    }

    return { item };
  }

  let acceptedEntityType: "task" | "decision" | null = null;
  let acceptedEntityId: string | null = null;
  let createdTask: Task | undefined;
  let createdDecision: Decision | undefined;

  if (item.kind === "task" || item.kind === "follow_up") {
    const { data: task, error: taskError } = await supabase
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

    if (taskError) throw taskError;
    acceptedEntityType = "task";
    acceptedEntityId = task.id;
    createdTask = task as Task;
  }

  if (item.kind === "decision") {
    const model = (item.model ?? {}) as Record<string, unknown>;
    const { data: decision, error: decisionError } = await supabase
      .from("decisions")
      .insert({
        user_id: context.userId,
        org_id: item.org_id,
        title: item.title,
        context: item.body,
        owner: typeof model.owner === "string" ? model.owner : null,
        status: "proposed",
        related_meeting_id: payload?.related_meeting_id ?? null,
        source_id: item.source_id
      })
      .select("*")
      .single();

    if (decisionError) throw decisionError;

    acceptedEntityType = "decision";
    acceptedEntityId = decision.id;
    createdDecision = decision as Decision;

    if (Array.isArray(payload?.task_ids) && payload.task_ids.length > 0) {
      const rows = payload.task_ids.map((taskId) => ({ decision_id: decision.id, task_id: taskId }));
      const { error: linkError } = await supabase
        .from("decision_task_links")
        .upsert(rows, { onConflict: "decision_id,task_id", ignoreDuplicates: true });

      if (linkError) throw linkError;
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("extracted_items")
    .update({
      status: "accepted",
      accepted_entity_type: acceptedEntityType,
      accepted_entity_id: acceptedEntityId,
      snoozed_until: null
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

export async function dismissQueueItem(context: ServerAuthContext, itemId: string) {
  const supabase = requireSupabase(context);
  const item = await getItem(context, itemId);

  if (item.status === "dismissed") return item;

  const { data, error } = await supabase
    .from("extracted_items")
    .update({ status: "dismissed" })
    .eq("id", item.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ExtractedItem;
}

export async function snoozeQueueItem(
  context: ServerAuthContext,
  itemId: string,
  snoozedUntil: string | null
) {
  const supabase = requireSupabase(context);
  const item = await getItem(context, itemId);

  const nextSnooze = optionalIsoDate(snoozedUntil) ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("extracted_items")
    .update({
      status: "snoozed",
      snoozed_until: nextSnooze,
      snooze_count: (item.snooze_count ?? 0) + 1
    })
    .eq("id", item.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ExtractedItem;
}
