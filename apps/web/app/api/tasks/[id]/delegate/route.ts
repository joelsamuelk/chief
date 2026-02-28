import { delegateTask } from "@/lib/services/task-service";
import { jsonOk, parseJson, withAuthedRoute } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withAuthedRoute(request, async (context) => {
    const payload = await parseJson<{ delegated_to: string }>(request);
    const task = await delegateTask(context, params.id, payload.delegated_to);
    return jsonOk({ task });
  });
}
