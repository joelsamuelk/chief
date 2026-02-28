import type { ExtractedItem, Source, SourceKind } from "@chief/types";
import type { AuthContext } from "@/lib/utils/auth";
import { extractFromSource } from "@/lib/ai/extract";
import { ApiError } from "@/lib/server/errors";

export interface CreateSourceInput {
  kind: SourceKind;
  provider: string;
  external_id?: string | null;
  raw_content: string;
  org_id?: string | null;
}

export interface ProcessSourceResult {
  source: Source;
  extracted_items: ExtractedItem[];
  output: Awaited<ReturnType<typeof extractFromSource>>;
  reused: boolean;
}

export interface SyncSourceItem {
  kind: SourceKind;
  external_id: string;
  raw_content: string;
  created_at?: string;
}

export interface SyncSourcesInput {
  provider: "google" | "microsoft";
  org_id?: string | null;
  items: SyncSourceItem[];
}

function cleanString(value: string | null | undefined) {
  if (!value) return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

async function assertAiRateLimit(context: AuthContext) {
  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const { count, error } = await context.supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (error) throw error;
  if ((count ?? 0) >= 20) {
    throw new ApiError(429, "rate_limited", "AI extraction rate limit reached.");
  }
}

async function getUserContext(context: AuthContext) {
  const { data, error } = await context.supabase
    .from("chief_profiles")
    .select("role,team_size,timezone,proactivity_level")
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? {};
}

export async function createSource(context: AuthContext, input: CreateSourceInput): Promise<Source> {
  const provider = input.provider.trim();
  if (provider.length === 0) {
    throw new ApiError(400, "validation_failed", "provider is required.");
  }

  const externalId = cleanString(input.external_id);
  if (externalId) {
    const { data: existing, error: existingError } = await context.supabase
      .from("sources")
      .select("*")
      .eq("user_id", context.userId)
      .eq("provider", provider)
      .eq("external_id", externalId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return existing as Source;
  }

  const { data, error } = await context.supabase
    .from("sources")
    .insert({
      user_id: context.userId,
      org_id: input.org_id ?? context.orgId,
      kind: input.kind,
      provider,
      external_id: externalId,
      raw_content: input.raw_content
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Source;
}

export async function syncSources(context: AuthContext, input: SyncSourcesInput): Promise<Source[]> {
  if (!Array.isArray(input.items) || input.items.length === 0) return [];

  const rows = input.items.map((item) => ({
    user_id: context.userId,
    org_id: input.org_id ?? context.orgId,
    kind: item.kind,
    provider: input.provider,
    external_id: item.external_id,
    raw_content: item.raw_content,
    created_at: item.created_at ? new Date(item.created_at).toISOString() : undefined
  }));

  const { data, error } = await context.supabase
    .from("sources")
    .upsert(rows, { onConflict: "user_id,provider,external_id", ignoreDuplicates: false })
    .select("*");

  if (error) throw error;
  return (data ?? []) as Source[];
}

function extractionToRows(
  context: AuthContext,
  source: Source,
  extraction: Awaited<ReturnType<typeof extractFromSource>>
) {
  const meta = {
    provider: extraction.meta.provider,
    model: extraction.meta.model,
    latency_ms: extraction.meta.latency_ms,
    deterministic_only: extraction.meta.deterministic_only
  };

  return [
    {
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "summary",
      status: "pending",
      title: extraction.summary.slice(0, 180),
      body: extraction.summary,
      priority: "medium",
      confidence: 0.72,
      evidence: [{ label: "source_summary", quote: extraction.summary.slice(0, 280), source_id: source.id }],
      model: meta
    },
    ...extraction.tasks.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "task",
      status: "pending",
      title: item.title,
      body: item.description,
      due_at: item.due_at ?? null,
      priority: item.priority ?? "medium",
      confidence: item.confidence,
      evidence: [{ label: "task_evidence", quote: item.evidence ?? item.description, source_id: source.id }],
      model: meta
    })),
    ...extraction.decisions.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "decision",
      status: "pending",
      title: item.title,
      body: item.description,
      due_at: item.due_at ?? null,
      priority: item.priority ?? "medium",
      confidence: item.confidence,
      evidence: [{ label: "decision_evidence", quote: item.evidence ?? item.description, source_id: source.id }],
      model: meta
    })),
    ...extraction.follow_ups.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "follow_up",
      status: "pending",
      title: item.title,
      body: item.description,
      due_at: item.due_at ?? null,
      priority: item.priority ?? "medium",
      confidence: item.confidence,
      evidence: [{ label: "follow_up_evidence", quote: item.evidence ?? item.description, source_id: source.id }],
      model: meta
    })),
    ...extraction.risks.map((item) => ({
      user_id: context.userId,
      org_id: source.org_id,
      source_id: source.id,
      kind: "risk",
      status: "pending",
      title: item.title,
      body: item.description,
      due_at: item.due_at ?? null,
      priority: item.priority ?? "high",
      confidence: item.confidence,
      evidence: [{ label: "risk_evidence", quote: item.evidence ?? item.description, source_id: source.id }],
      model: meta
    }))
  ];
}

export async function processSource(context: AuthContext, sourceId: string): Promise<ProcessSourceResult> {
  const { data: sourceData, error: sourceError } = await context.supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (sourceError) throw sourceError;
  if (!sourceData) {
    throw new ApiError(404, "source_not_found", "Source not found.");
  }

  const source = sourceData as Source;
  const { data: existing, error: existingError } = await context.supabase
    .from("extracted_items")
    .select("*")
    .eq("source_id", source.id)
    .order("created_at", { ascending: true });

  if (existingError) throw existingError;
  if ((existing ?? []).length > 0) {
    return {
      source,
      extracted_items: (existing ?? []) as ExtractedItem[],
      output: {
        summary: "Already processed.",
        tasks: [],
        decisions: [],
        follow_ups: [],
        risks: [],
        meta: {
          provider: "heuristic",
          model: "cached-existing-items",
          latency_ms: 0,
          deterministic_only: true
        }
      },
      reused: true
    };
  }

  await assertAiRateLimit(context);
  const userContext = await getUserContext(context);
  const extraction = await extractFromSource({
    rawContent: source.raw_content,
    userContext
  });

  const { error: runError } = await context.supabase.from("ai_runs").insert({
    user_id: context.userId,
    org_id: source.org_id,
    source_id: source.id,
    provider: extraction.meta.provider,
    model: extraction.meta.model,
    status: "completed",
    latency_ms: extraction.meta.latency_ms
  });
  if (runError) throw runError;

  const { data: insertedItems, error: insertError } = await context.supabase
    .from("extracted_items")
    .insert(extractionToRows(context, source, extraction))
    .select("*");

  if (insertError) throw insertError;

  const { error: sourceUpdateError } = await context.supabase
    .from("sources")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", source.id);
  if (sourceUpdateError) throw sourceUpdateError;

  return {
    source,
    extracted_items: (insertedItems ?? []) as ExtractedItem[],
    output: extraction,
    reused: false
  };
}
