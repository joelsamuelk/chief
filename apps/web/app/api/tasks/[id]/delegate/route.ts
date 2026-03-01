import { delegateTask } from "@/lib/services/tasks";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await parseJson<{ delegated_to: string }>(request);
    const task = delegateTask(params.id, payload.delegated_to);
    return jsonOk({ task });
  } catch (error) {
    return jsonError(error);
  }
}
