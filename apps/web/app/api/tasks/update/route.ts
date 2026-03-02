import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import {
  acknowledgeDelegation,
  archiveTask,
  completeTask,
  delegateTask,
  deleteTask,
  reopenTask,
  updateTask
} from "@/lib/services/tasks";

type UpdateAction =
  | "update"
  | "complete"
  | "reopen"
  | "archive"
  | "delete"
  | "delegate"
  | "acknowledge";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      action: UpdateAction;
      task_id: string;
      delegated_to?: string;
      patch?: {
        title?: string;
        description?: string | null;
        due_at?: string | null;
        priority?: "low" | "medium" | "high";
        status?: "open" | "completed" | "archived" | "waiting";
        waiting_on?: string | null;
        initiative_id?: string | null;
      };
    }>(request);

    if (!payload.task_id) {
      throw new Error("task_id is required.");
    }

    if (payload.action === "complete") {
      const result = completeTask(payload.task_id);
      return jsonOk({ task: result.task, changed: result.changed });
    }
    if (payload.action === "reopen") {
      return jsonOk({ task: reopenTask(payload.task_id) });
    }
    if (payload.action === "archive") {
      return jsonOk({ task: archiveTask(payload.task_id) });
    }
    if (payload.action === "delete") {
      return jsonOk(deleteTask(payload.task_id));
    }
    if (payload.action === "delegate") {
      if (!payload.delegated_to) throw new Error("delegated_to is required.");
      return jsonOk({ task: delegateTask(payload.task_id, payload.delegated_to) });
    }
    if (payload.action === "acknowledge") {
      return jsonOk({ task: acknowledgeDelegation(payload.task_id) });
    }

    return jsonOk({
      task: updateTask(payload.task_id, {
        title: payload.patch?.title,
        description: payload.patch?.description,
        due_at: payload.patch?.due_at,
        priority: payload.patch?.priority,
        status: payload.patch?.status,
        waiting_on: payload.patch?.waiting_on,
        initiative_id: payload.patch?.initiative_id
      })
    });
  } catch (error) {
    return jsonError(error);
  }
}
