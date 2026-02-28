import type { ServerAuthContext } from "@chief/data/server";
import { requireSupabase } from "../server/http";

const exportTables = [
  "chief_profiles",
  "oauth_connections",
  "sources",
  "extracted_items",
  "tasks",
  "meetings",
  "decisions",
  "decision_task_links",
  "ai_runs",
  "today_snapshots",
  "organizations",
  "organization_members",
  "profiles",
  "events",
  "weekly_focus"
] as const;

export async function exportAccountData(context: ServerAuthContext) {
  const supabase = requireSupabase(context);

  const exported: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: context.userId
  };

  for (const table of exportTables) {
    let query = supabase.from(table).select("*");

    if (table === "organizations") {
      query = query.eq("owner_id", context.userId);
    } else if (table === "organization_members") {
      query = query.eq("user_id", context.userId);
    } else if (table === "profiles") {
      query = query.eq("id", context.userId);
    } else if (table === "decision_task_links") {
      const { data: decisions } = await supabase.from("decisions").select("id").eq("user_id", context.userId);
      const ids = (decisions ?? []).map((item) => item.id);
      if (ids.length === 0) {
        exported[table] = [];
        continue;
      }
      query = query.in("decision_id", ids);
    } else {
      query = query.eq("user_id", context.userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    exported[table] = data ?? [];
  }

  return exported;
}

export async function deleteAccountData(
  context: ServerAuthContext,
  options?: { delete_auth_user?: boolean }
) {
  const supabase = requireSupabase(context);

  await supabase.from("today_snapshots").delete().eq("user_id", context.userId);
  await supabase.from("ai_runs").delete().eq("user_id", context.userId);
  await supabase.from("decisions").delete().eq("user_id", context.userId);
  await supabase.from("meetings").delete().eq("user_id", context.userId);
  await supabase.from("tasks").delete().eq("user_id", context.userId);
  await supabase.from("extracted_items").delete().eq("user_id", context.userId);
  await supabase.from("sources").delete().eq("user_id", context.userId);
  await supabase.from("oauth_connections").delete().eq("user_id", context.userId);
  await supabase.from("chief_profiles").delete().eq("user_id", context.userId);
  await supabase.from("organization_members").delete().eq("user_id", context.userId);
  await supabase.from("organizations").delete().eq("owner_id", context.userId);

  await supabase.from("events").delete().eq("user_id", context.userId);
  await supabase.from("weekly_focus").delete().eq("user_id", context.userId);
  await supabase.from("profiles").delete().eq("id", context.userId);

  if (options?.delete_auth_user && context.serviceSupabase) {
    await context.serviceSupabase.auth.admin.deleteUser(context.userId);
  }

  return {
    deleted: true,
    auth_user_deleted: options?.delete_auth_user ? Boolean(context.serviceSupabase) : false
  };
}
