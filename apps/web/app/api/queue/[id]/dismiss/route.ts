import { dismissQueueItem } from "@/lib/services/action-queue-service";
import { jsonOk, withAuthedRoute } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withAuthedRoute(request, async (context) => {
    const item = await dismissQueueItem(context, params.id);
    return jsonOk({ item });
  });
}
