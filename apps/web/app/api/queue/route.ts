import { jsonError, jsonOk } from "@/lib/server/http";
import { listQueue } from "@/lib/services/queue";

export async function GET() {
  try {
    const queue = listQueue();
    return jsonOk(queue);
  } catch (error) {
    return jsonError(error);
  }
}
