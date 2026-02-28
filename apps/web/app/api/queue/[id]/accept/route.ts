import { acceptQueueItem } from "@/lib/services/action-queue-service";
import { jsonOk, parseOptionalJson, withAuthedRoute } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withAuthedRoute(request, async (context) => {
    const payload = await parseOptionalJson<{ related_meeting_id?: string | null; task_ids?: string[] }>(
      request,
      {}
    );
    const result = await acceptQueueItem(context, params.id, payload);
    return jsonOk(result);
  });
}
