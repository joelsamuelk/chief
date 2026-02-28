import type { AuthContext } from "@/lib/utils/auth";
import { ApiError } from "@/lib/server/errors";

type Provider = "google" | "microsoft" | "apple";

export interface InboxConnection {
  provider: Provider;
  connected: boolean;
  connected_at: string | null;
  accounts: number;
}

export interface InboxConnectionAccount {
  id: string;
  provider: Provider;
  provider_user_id: string;
  created_at: string;
}

export interface InboxItem {
  id: string;
  provider: string;
  kind: string;
  preview: string;
  created_at: string;
  processed_at: string | null;
}

export interface InboxOverview {
  connections: InboxConnection[];
  connection_accounts: InboxConnectionAccount[];
  queue_count: number;
  items: InboxItem[];
}

function toPreview(raw: string) {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export async function getInboxOverview(context: AuthContext): Promise<InboxOverview> {
  const [{ data: connectionsData, error: connectionsError }, { data: sourceData, error: sourceError }, { count, error: queueError }] =
    await Promise.all([
      context.supabase
        .from("oauth_connections")
        .select("id,provider,provider_user_id,created_at")
        .eq("user_id", context.userId),
      context.supabase
        .from("sources")
        .select("id,provider,kind,raw_content,created_at,processed_at")
        .order("created_at", { ascending: false })
        .limit(80),
      context.supabase
        .from("extracted_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
    ]);

  if (connectionsError) throw connectionsError;
  if (sourceError) throw sourceError;
  if (queueError) throw queueError;

  const connectionAccounts = (connectionsData ?? []) as Array<{
    id: string;
    provider: Provider;
    provider_user_id: string;
    created_at: string;
  }>;

  const providers: Provider[] = ["google", "microsoft", "apple"];
  const connections: InboxConnection[] = providers.map((provider) => {
    const matches = connectionAccounts.filter((row) => row.provider === provider);
    const latest = matches.length > 0
      ? [...matches].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      : null;

    return {
      provider,
      connected: matches.length > 0,
      connected_at: latest?.created_at ?? null,
      accounts: matches.length
    };
  });

  const items: InboxItem[] = ((sourceData ?? []) as Array<{
    id: string;
    provider: string;
    kind: string;
    raw_content: string;
    created_at: string;
    processed_at: string | null;
  }>).map((row) => ({
    id: row.id,
    provider: row.provider,
    kind: row.kind,
    preview: toPreview(row.raw_content),
    created_at: row.created_at,
    processed_at: row.processed_at
  }));

  return {
    connections,
    connection_accounts: connectionAccounts,
    queue_count: count ?? 0,
    items
  };
}

function clean(value: string | null | undefined) {
  if (!value) return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export async function connectProvider(context: AuthContext, provider: Provider, providerUserId?: string) {
  const accountId = clean(providerUserId) ?? `${provider}:${Date.now()}`;

  const { data: existing, error: existingError } = await context.supabase
    .from("oauth_connections")
    .select("id,provider,provider_user_id,created_at")
    .eq("user_id", context.userId)
    .eq("provider", provider)
    .eq("provider_user_id", accountId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await context.supabase
    .from("oauth_connections")
    .insert(
      {
        user_id: context.userId,
        org_id: context.orgId,
        provider,
        provider_user_id: accountId
      },
    )
    .select("id,provider,provider_user_id,created_at")
    .single();

  if (error) {
    if (
      provider === "apple" &&
      typeof (error as { code?: unknown }).code === "string" &&
      ((error as { code?: string }).code === "23514" || (error as { code?: string }).code === "22P02")
    ) {
      throw new ApiError(
        400,
        "provider_not_supported",
        "Apple account connections are not enabled in this Supabase schema yet."
      );
    }
    throw error;
  }
  return data;
}

export async function disconnectProvider(context: AuthContext, provider: Provider, connectionId?: string) {
  let query = context.supabase
    .from("oauth_connections")
    .delete()
    .eq("user_id", context.userId)
    .eq("provider", provider);

  if (connectionId) {
    query = query.eq("id", connectionId);
  }

  const { error } = await query;

  if (error) throw error;
}
