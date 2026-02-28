import type { ServerAuthContext } from "@chief/data/server";
import type { NotificationPlan, ProactivityLevel } from "@chief/types";
import { requireSupabase } from "../server/http";

function planForLevel(level: ProactivityLevel): NotificationPlan {
  if (level === "reactive") {
    return {
      proactivity_level: level,
      channels: ["in_app"]
    };
  }

  if (level === "quiet") {
    return {
      proactivity_level: level,
      channels: ["in_app", "brief", "risk_alert"]
    };
  }

  return {
    proactivity_level: level,
    channels: ["in_app", "brief", "risk_alert", "delegation_alert", "overdue_alert"]
  };
}

export async function getNotificationPlan(context: ServerAuthContext): Promise<NotificationPlan> {
  const supabase = requireSupabase(context);

  const { data } = await supabase
    .from("chief_profiles")
    .select("proactivity_level")
    .eq("user_id", context.userId)
    .maybeSingle();

  const level = (data?.proactivity_level as ProactivityLevel | undefined) ?? "quiet";
  return planForLevel(level);
}
