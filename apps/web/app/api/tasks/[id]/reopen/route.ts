import { reopenTask } from "@/lib/services/tasks";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const task = reopenTask(params.id);
    return jsonOk({ task });
  } catch (error) {
    return jsonError(error);
  }
}
