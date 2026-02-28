import type { ServerAuthContext } from "@chief/data/server";
import type { Task } from "@chief/types";
import { ApiError } from "../server/errors";
import { requireSupabase } from "../server/http";

function isOverdue(task: Task) {
  const dueAt = task.due_at ?? task.end_at ?? task.start_at;
  if (!dueAt) return false;
  if (task.status === "completed" || task.status === "done" || task.status === "archived") return false;
  return new Date(dueAt).getTime() < Date.now();
}

export async function getTeamOverview(context: ServerAuthContext) {
  const supabase = requireSupabase(context);
  if (!context.orgId) {
    throw new ApiError(400, "org_required", "x-org-id header is required for team overview.");
  }

  const [
    { data: delegated, error: delegatedError },
    { data: summaryItems, error: summaryError },
    { data: priorities, error: prioritiesError }
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("org_id", context.orgId)
      .not("delegated_to", "is", null)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("extracted_items")
      .select("id,title,body,created_at,user_id")
      .eq("org_id", context.orgId)
      .eq("kind", "summary")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("tasks")
      .select("id,title,user_id,priority,due_at,status")
      .eq("org_id", context.orgId)
      .in("status", ["open", "waiting"])
      .order("created_at", { ascending: false })
      .limit(40)
  ]);

  if (delegatedError) throw delegatedError;
  if (summaryError) throw summaryError;
  if (prioritiesError) throw prioritiesError;

  const delegatedTasks = (delegated ?? []) as Task[];
  const blockers = delegatedTasks.filter((task) => task.status === "waiting" || isOverdue(task));

  return {
    delegated_tasks: delegatedTasks,
    blockers,
    team_priorities: priorities ?? [],
    structured_updates: summaryItems ?? []
  };
}
