import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { ApiError } from "@/lib/server/errors";
import {
  archiveTask,
  completeTask,
  createTask,
  delegateTask,
  reopenTask,
  updateTask
} from "@/lib/services/tasks";
import { requireAuth } from "@/lib/utils/auth";
import {
  parseWithSchema,
  taskUpdateSchema,
  type TaskUpdatePayload
} from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<TaskUpdatePayload>(
      taskUpdateSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: TaskUpdatePayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );

    if (payload.action === "create") {
      const task = await createTask(context, {
        title: payload.payload?.title ?? "",
        description: payload.payload?.description,
        due_at: payload.payload?.due_at,
        priority: payload.payload?.priority,
        status: payload.payload?.status,
        source_id: payload.payload?.source_id,
        org_id: payload.payload?.org_id
      });
      return jsonOk({ task }, { status: 201 });
    }

    if (!payload.task_id) {
      throw new ApiError(400, "validation_failed", "task_id is required for this action.");
    }

    if (payload.action === "complete") {
      const task = await completeTask(context, payload.task_id);
      return jsonOk({ task });
    }

    if (payload.action === "archive") {
      const task = await archiveTask(context, payload.task_id);
      return jsonOk({ task });
    }

    if (payload.action === "reopen") {
      const task = await reopenTask(context, payload.task_id);
      return jsonOk({ task });
    }

    if (payload.action === "delegate") {
      const task = await delegateTask(context, payload.task_id, payload.delegated_to ?? "");
      return jsonOk({ task });
    }

    const task = await updateTask(context, payload.task_id, {
      title: payload.payload?.title,
      description: payload.payload?.description,
      due_at: payload.payload?.due_at,
      priority: payload.payload?.priority,
      status: payload.payload?.status,
      source_id: payload.payload?.source_id
    });
    return jsonOk({ task });
  } catch (error) {
    return jsonError(error);
  }
}
