import { updateTask } from "@/lib/services/tasks";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await parseJson<{
      title?: string;
      description?: string | null;
      due_at?: string | null;
      priority?: "low" | "medium" | "high";
      status?: "open" | "completed" | "archived" | "waiting";
      waiting_on?: string | null;
    }>(request);

    const task = updateTask(params.id, payload);
    return jsonOk({ task });
  } catch (error) {
    return jsonError(error);
  }
}
