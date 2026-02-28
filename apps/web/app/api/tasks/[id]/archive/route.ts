import { archiveTask } from "@/lib/services/task-service";
import { jsonOk, withAuthedRoute } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withAuthedRoute(request, async (context) => {
    const task = await archiveTask(context, params.id);
    return jsonOk({ task });
  });
}
