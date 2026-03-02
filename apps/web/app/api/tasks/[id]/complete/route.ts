import { completeTask } from "@/lib/services/tasks";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = completeTask(params.id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
