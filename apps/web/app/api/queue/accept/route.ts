import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { acceptExtractedItem } from "@/lib/services/queue";
import { requireAuth } from "@/lib/utils/auth";
import {
  parseWithSchema,
  queueAcceptSchema,
  type QueueAcceptPayload
} from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<QueueAcceptPayload>(
      queueAcceptSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: QueueAcceptPayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );
    const result = await acceptExtractedItem(context, payload.id, {
      related_meeting_id: payload.related_meeting_id,
      task_ids: payload.task_ids
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
