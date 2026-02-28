import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { dismissExtractedItem } from "@/lib/services/queue";
import { requireAuth } from "@/lib/utils/auth";
import {
  parseWithSchema,
  queueDismissSchema,
  type QueueDismissPayload
} from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<QueueDismissPayload>(
      queueDismissSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: QueueDismissPayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );
    const item = await dismissExtractedItem(context, payload.id);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error);
  }
}
