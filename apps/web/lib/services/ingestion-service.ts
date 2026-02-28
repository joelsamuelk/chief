import type { ServerAuthContext } from "@chief/data/server";
import type { Source, SourceKind } from "@chief/types";
import { ApiError } from "../server/errors";
import { requireSupabase } from "../server/http";
import { optionalString, requireString } from "./common";

export interface CreateSourceInput {
  kind: SourceKind;
  provider: string;
  external_id?: string | null;
  raw_content: string;
  org_id?: string | null;
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

function assertKind(value: string): SourceKind {
  if (value === "email" || value === "meeting" || value === "shared_text" || value === "manual") {
    return value;
  }

  throw new ApiError(400, "invalid_kind", `Unsupported source kind: ${value}`);
}

export async function createSource(context: ServerAuthContext, input: CreateSourceInput): Promise<Source> {
  const supabase = requireSupabase(context);
  const provider = requireString(input.provider, "provider");
  const rawContent = requireString(input.raw_content, "raw_content");
  const externalId = optionalString(input.external_id);

  const row = {
    user_id: context.userId,
    org_id: input.org_id ?? context.orgId ?? null,
    kind: assertKind(input.kind),
    provider,
    external_id: externalId,
    raw_content: rawContent
  };

  if (externalId) {
    const { data: existing, error: existingError } = await supabase
      .from("sources")
      .select("*")
      .eq("user_id", context.userId)
      .eq("provider", provider)
      .eq("external_id", externalId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return existing as Source;
  }

  const { data, error } = await supabase.from("sources").insert(row).select("*").single();
  if (error) throw error;

  return data as Source;
}

export async function syncSources(context: ServerAuthContext, input: SyncSourcesInput): Promise<Source[]> {
  const supabase = requireSupabase(context);
  if (!Array.isArray(input.items) || input.items.length === 0) return [];

  const rows = input.items.map((item) => ({
    user_id: context.userId,
    org_id: input.org_id ?? context.orgId ?? null,
    kind: assertKind(item.kind),
    provider: input.provider,
    external_id: requireString(item.external_id, "external_id"),
    raw_content: requireString(item.raw_content, "raw_content"),
    created_at: item.created_at ? new Date(item.created_at).toISOString() : undefined
  }));

  const { data, error } = await supabase
    .from("sources")
    .upsert(rows, { onConflict: "user_id,provider,external_id", ignoreDuplicates: false })
    .select("*");

  if (error) throw error;
  return (data ?? []) as Source[];
}
