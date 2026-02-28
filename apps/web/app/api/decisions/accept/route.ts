import { acceptExtractedDecision } from "@/lib/services/decision-service";
import { jsonOk, parseJson, withAuthedRoute } from "@/lib/server/http";

export async function POST(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const payload = await parseJson<{
      extracted_item_id: string;
      related_meeting_id?: string | null;
      task_ids?: string[];
    }>(request);

    const decision = await acceptExtractedDecision(context, payload);
    return jsonOk({ decision });
  });
}
