import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { handleAssistQuery } from "@/lib/services/assist";
import { requireAuth } from "@/lib/utils/auth";
import {
  assistRequestSchema,
  parseWithSchema,
  type AssistRequestPayload
} from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<AssistRequestPayload>(
      assistRequestSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: AssistRequestPayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );
    const assist = await handleAssistQuery(context, payload.query, payload.meeting_time);
    return jsonOk(assist);
  } catch (error) {
    return jsonError(error);
  }
}
