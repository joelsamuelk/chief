import type { Decision } from "@chief/types";
import type { AuthContext } from "@/lib/utils/auth";
import { acceptExtractedItem } from "./queue";

export async function createDecision(
  context: AuthContext,
  payload: {
    title: string;
    context?: string | null;
    owner?: string | null;
    related_meeting_id?: string | null;
    status?: "proposed" | "approved" | "implemented";
    source_id?: string | null;
    org_id?: string | null;
    task_ids?: string[];
  }
): Promise<Decision> {
  const { data, error } = await context.supabase
    .from("decisions")
    .insert({
      user_id: context.userId,
      org_id: payload.org_id ?? context.orgId,
      title: payload.title.trim(),
      context: payload.context ?? null,
      owner: payload.owner ?? null,
      status: payload.status ?? "proposed",
      related_meeting_id: payload.related_meeting_id ?? null,
      source_id: payload.source_id ?? null
    })
    .select("*")
    .single();

  if (error) throw error;
  const decision = data as Decision;

  if (payload.task_ids && payload.task_ids.length > 0) {
    const rows = payload.task_ids.map((taskId) => ({ decision_id: decision.id, task_id: taskId }));
    const { error: linkError } = await context.supabase
      .from("decision_task_links")
      .upsert(rows, { onConflict: "decision_id,task_id", ignoreDuplicates: true });
    if (linkError) throw linkError;
  }

  return decision;
}

export async function acceptExtractedDecision(
  context: AuthContext,
  extractedItemId: string,
  relatedMeetingId?: string | null,
  taskIds?: string[]
) {
  const accepted = await acceptExtractedItem(context, extractedItemId, {
    related_meeting_id: relatedMeetingId ?? null,
    task_ids: taskIds
  });

  return accepted.created_decision ?? null;
}

export async function updateDecisionStatus(
  context: AuthContext,
  decisionId: string,
  status: "proposed" | "approved" | "implemented"
) {
  const { data, error } = await context.supabase
    .from("decisions")
    .update({ status })
    .eq("id", decisionId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Decision;
}

export async function listPendingDecisions(context: AuthContext) {
  const { data, error } = await context.supabase
    .from("decisions")
    .select("*")
    .in("status", ["proposed", "approved"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Decision[];
}

export async function getDecisionLedger(context: AuthContext) {
  const { data, error } = await context.supabase
    .from("decisions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Decision[];
}
