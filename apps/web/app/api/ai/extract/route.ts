import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { processSource } from "@/lib/services/sources";
import { requireAuth } from "@/lib/utils/auth";
import {
  extractRequestSchema,
  parseWithSchema,
  type ExtractRequestPayload
} from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<ExtractRequestPayload>(
      extractRequestSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: ExtractRequestPayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );
    const result = await processSource(context, payload.source_id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
