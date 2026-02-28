import { updateTask } from "@/lib/services/task-service";
import { jsonOk, parseJson, withAuthedRoute } from "@/lib/server/http";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withAuthedRoute(request, async (context) => {
    const payload = await parseJson<{
      title?: string;
      description?: string | null;
      due_at?: string | null;
      priority?: string;
      status?: string;
      delegated_to?: string | null;
      delegated_acknowledged_at?: string | null;
    }>(request);

    const task = await updateTask(context, params.id, payload);
    return jsonOk({ task });
  });
}
