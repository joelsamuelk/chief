import type { ServerAuthContext } from "@chief/data/server";
import type { Decision } from "@chief/types";
import { ApiError } from "../server/errors";
import { requireSupabase } from "../server/http";
import { acceptQueueItem } from "./action-queue-service";

export async function listDecisionLedger(context: ServerAuthContext) {
  const supabase = requireSupabase(context);
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Decision[];
}

export async function createDecision(
  context: ServerAuthContext,
  payload: {
    title: string;
    context?: string | null;
    owner?: string | null;
    related_meeting_id?: string | null;
    status?: "proposed" | "approved" | "implemented";
    org_id?: string | null;
    source_id?: string | null;
    task_ids?: string[];
  }
) {
  const supabase = requireSupabase(context);

  if (!payload.title || payload.title.trim().length === 0) {
    throw new ApiError(400, "invalid_request", "title is required.");
  }

  const { data: decision, error: decisionError } = await supabase
    .from("decisions")
    .insert({
      user_id: context.userId,
      org_id: payload.org_id ?? context.orgId ?? null,
      title: payload.title.trim(),
      context: payload.context ?? null,
      owner: payload.owner ?? null,
      status: payload.status ?? "proposed",
      related_meeting_id: payload.related_meeting_id ?? null,
      source_id: payload.source_id ?? null
    })
    .select("*")
    .single();

  if (decisionError) throw decisionError;

  if (Array.isArray(payload.task_ids) && payload.task_ids.length > 0) {
    const rows = payload.task_ids.map((taskId) => ({ decision_id: decision.id, task_id: taskId }));
    const { error: linkError } = await supabase
      .from("decision_task_links")
      .upsert(rows, { onConflict: "decision_id,task_id", ignoreDuplicates: true });

    if (linkError) throw linkError;
  }

  return decision as Decision;
}

export async function acceptExtractedDecision(
  context: ServerAuthContext,
  payload: { extracted_item_id: string; related_meeting_id?: string | null; task_ids?: string[] }
) {
  const accepted = await acceptQueueItem(context, payload.extracted_item_id, {
    related_meeting_id: payload.related_meeting_id,
    task_ids: payload.task_ids
  });

  if (!accepted.created_decision) {
    throw new ApiError(
      400,
      "invalid_queue_item",
      "Extracted item was accepted but did not produce a decision record."
    );
  }

  return accepted.created_decision;
}

export async function updateDecisionStatus(
  context: ServerAuthContext,
  decisionId: string,
  status: "proposed" | "approved" | "implemented"
) {
  const supabase = requireSupabase(context);

  const { data, error } = await supabase
    .from("decisions")
    .update({ status })
    .eq("id", decisionId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Decision;
}

export async function listPendingDecisions(context: ServerAuthContext) {
  const supabase = requireSupabase(context);

  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .in("status", ["proposed", "approved"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Decision[];
}
