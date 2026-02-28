import type { ServerAuthContext } from "@chief/data/server";
import type { ExtractedItem, ExtractionOutput, Source } from "@chief/types";
import { extractFromSourceLegacy } from "../ai/extract";
import { ApiError } from "../server/errors";
import { requireSupabase } from "../server/http";

export interface RunExtractionResult {
  source: Source;
  output: ExtractionOutput;
  extracted_items: ExtractedItem[];
}

export async function runExtractionForSource(
  context: ServerAuthContext,
  sourceId: string
): Promise<RunExtractionResult> {
  const supabase = requireSupabase(context);
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError) throw sourceError;
  if (!source) {
    throw new ApiError(404, "source_not_found", "Source not found.");
  }

  const extraction = await extractFromSourceLegacy({
    sourceId: source.id,
    provider: source.provider,
    kind: source.kind,
    rawContent: source.raw_content
  });

  const runRow = {
    user_id: context.userId,
    org_id: source.org_id,
    source_id: source.id,
    provider: extraction.model.provider,
    model: extraction.model.name,
    status: "completed",
    latency_ms: extraction.model.latency_ms
  };

  const { error: runError } = await supabase.from("ai_runs").insert(runRow);
  if (runError) throw runError;

  const baseModel = {
    provider: extraction.model.provider,
    model: extraction.model.name,
    latency_ms: extraction.model.latency_ms,
    deterministic_only: extraction.model.deterministic_only
  };

  const rows = [
    {
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "summary",
      status: "pending",
      title: extraction.summary.text.slice(0, 180),
      body: extraction.summary.text,
      priority: "medium",
      confidence: extraction.summary.confidence,
      evidence: extraction.summary.evidence,
      model: baseModel
    },
    ...extraction.tasks.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "task",
      status: "pending",
      title: item.title,
      body: item.body ?? null,
      due_at: item.due_at ?? null,
      priority: item.priority ?? "medium",
      confidence: item.confidence,
      evidence: item.evidence,
      model: baseModel
    })),
    ...extraction.decisions.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "decision",
      status: "pending",
      title: item.title,
      body: item.context ?? null,
      priority: "medium",
      confidence: item.confidence,
      evidence: item.evidence,
      model: { ...baseModel, owner: item.owner ?? null }
    })),
    ...extraction.follow_ups.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "follow_up",
      status: "pending",
      title: item.title,
      body: item.body ?? null,
      due_at: item.due_at ?? null,
      priority: item.priority ?? "medium",
      confidence: item.confidence,
      evidence: item.evidence,
      model: baseModel
    })),
    ...extraction.risks.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "risk",
      status: "pending",
      title: item.title,
      body: item.body ?? null,
      due_at: item.due_at ?? null,
      priority: item.priority ?? "high",
      confidence: item.confidence,
      evidence: item.evidence,
      model: baseModel
    }))
  ];

  const { data: extracted, error: extractedError } = await supabase
    .from("extracted_items")
    .insert(rows)
    .select("*");

  if (extractedError) throw extractedError;

  const { error: sourceUpdateError } = await supabase
    .from("sources")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", source.id);

  if (sourceUpdateError) throw sourceUpdateError;

  return {
    source: source as Source,
    output: extraction,
    extracted_items: (extracted ?? []) as ExtractedItem[]
  };
}
