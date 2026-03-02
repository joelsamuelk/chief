import { jsonError, jsonOk, parseOptionalJson } from "@/lib/server/http";
import {
  computeExecutionAlignment,
  createCheckins,
  createInitiative,
  createKeyResult,
  createObjective,
  createOutcome,
  deleteInitiative,
  deleteKeyResult,
  deleteObjective,
  deleteOutcome,
  generateWeeklyExecutionBrief,
  listExecutionTree,
  listInitiatives,
  updateInitiative,
  updateKeyResult,
  updateObjective,
  updateOutcome
} from "@/lib/services/execution";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") ?? "tree";

    if (mode === "initiatives") {
      return jsonOk({ initiatives: listInitiatives() });
    }

    const quarter = searchParams.get("quarter") ?? undefined;
    const tree = listExecutionTree(quarter);
    const alignment = computeExecutionAlignment();
    return jsonOk({ ...tree, alignment });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseOptionalJson<{
      action?:
        | "create_outcome"
        | "create_objective"
        | "create_key_result"
        | "create_initiative"
        | "update_outcome"
        | "update_objective"
        | "update_key_result"
        | "update_initiative"
        | "delete_outcome"
        | "delete_objective"
        | "delete_key_result"
        | "delete_initiative"
        | "weekly_checkin"
        | "weekly_brief";
      id?: string;
      title?: string;
      description?: string | null;
      quarter?: string;
      owner_id?: string;
      outcome_id?: string;
      objective_id?: string;
      key_result_id?: string;
      metric_name?: string;
      target_value?: number;
      current_value?: number;
      status?: "on_track" | "at_risk" | "off_track";
      checkins?: Array<{
        entity_type: "outcome" | "objective" | "key_result" | "initiative";
        entity_id: string;
        status: "on_track" | "at_risk" | "off_track";
        note?: string;
      }>;
    }>(request, {});

    if (payload.action === "create_outcome") {
      if (!payload.title || !payload.quarter) {
        throw new Error("title and quarter are required.");
      }
      return jsonOk({ outcome: createOutcome(payload as { title: string; quarter: string; description?: string | null; owner_id?: string }) });
    }

    if (payload.action === "create_objective") {
      if (!payload.title || !payload.outcome_id) {
        throw new Error("title and outcome_id are required.");
      }
      return jsonOk({ objective: createObjective(payload as { title: string; outcome_id: string; description?: string | null; owner_id?: string }) });
    }

    if (payload.action === "create_key_result") {
      if (!payload.objective_id || !payload.metric_name || typeof payload.target_value !== "number") {
        throw new Error("objective_id, metric_name, and target_value are required.");
      }
      return jsonOk({
        key_result: createKeyResult({
          objective_id: payload.objective_id,
          metric_name: payload.metric_name,
          target_value: payload.target_value,
          current_value: payload.current_value,
          status: payload.status,
          owner_id: payload.owner_id
        })
      });
    }

    if (payload.action === "create_initiative") {
      if (!payload.key_result_id || !payload.title) {
        throw new Error("key_result_id and title are required.");
      }
      return jsonOk({
        initiative: createInitiative({
          key_result_id: payload.key_result_id,
          title: payload.title,
          description: payload.description,
          owner_id: payload.owner_id
        })
      });
    }

    if (payload.action === "update_outcome") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({
        outcome: updateOutcome({ id: payload.id, title: payload.title, description: payload.description })
      });
    }

    if (payload.action === "update_objective") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({
        objective: updateObjective({ id: payload.id, title: payload.title, description: payload.description })
      });
    }

    if (payload.action === "update_key_result") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({
        key_result: updateKeyResult({
          id: payload.id,
          metric_name: payload.metric_name,
          target_value: payload.target_value,
          current_value: payload.current_value,
          status: payload.status
        })
      });
    }

    if (payload.action === "update_initiative") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({
        initiative: updateInitiative({
          id: payload.id,
          title: payload.title,
          description: payload.description
        })
      });
    }

    if (payload.action === "delete_outcome") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({ deleted: deleteOutcome({ id: payload.id }) });
    }

    if (payload.action === "delete_objective") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({ deleted: deleteObjective({ id: payload.id }) });
    }

    if (payload.action === "delete_key_result") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({ deleted: deleteKeyResult({ id: payload.id }) });
    }

    if (payload.action === "delete_initiative") {
      if (!payload.id) throw new Error("id is required.");
      return jsonOk({ deleted: deleteInitiative({ id: payload.id }) });
    }

    if (payload.action === "weekly_checkin") {
      const checkins = payload.checkins ?? [];
      if (checkins.length === 0) throw new Error("checkins are required.");
      return jsonOk({ checkins: createCheckins({ checkins }) });
    }

    if (payload.action === "weekly_brief") {
      return jsonOk({ brief: generateWeeklyExecutionBrief() });
    }

    throw new Error("Unsupported action.");
  } catch (error) {
    return jsonError(error);
  }
}
