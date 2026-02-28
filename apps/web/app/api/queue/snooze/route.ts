import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { snoozeExtractedItem } from "@/lib/services/queue";
import { requireAuth } from "@/lib/utils/auth";
import {
  parseWithSchema,
  queueSnoozeSchema,
  type QueueSnoozePayload
} from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<QueueSnoozePayload>(
      queueSnoozeSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: QueueSnoozePayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );
    const item = await snoozeExtractedItem(context, payload.id, payload.until);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error);
  }
}
