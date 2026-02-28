import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { createTask, getTasks } from "@/lib/services/tasks";
import { requireAuth } from "@/lib/utils/auth";
import {
  parseWithSchema,
  tasksQuerySchema,
  type TasksQueryPayload
} from "@/lib/utils/validation";

export async function GET(request: Request) {
  try {
    const context = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const payload = parseWithSchema<TasksQueryPayload>(
      tasksQuerySchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: TasksQueryPayload;
          error?: { flatten: () => unknown };
        };
      },
      {
        filter: searchParams.get("filter") ?? "all"
      }
    );
    const tasks = await getTasks(context, payload.filter);
    return jsonOk({ tasks, filter: payload.filter });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = await parseJson<{
      title: string;
      description?: string | null;
      due_at?: string | null;
      priority?: "low" | "medium" | "high" | "med";
      status?: "open" | "waiting" | "completed" | "done" | "archived";
      source_id?: string | null;
      org_id?: string | null;
    }>(request);

    const task = await createTask(context, payload);
    return jsonOk({ task }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
