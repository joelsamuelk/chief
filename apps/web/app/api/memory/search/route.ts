import { jsonError, jsonOk } from "@/lib/server/http";
import { searchMemory } from "@/lib/services/memory";
import { requireAuth } from "@/lib/utils/auth";
import {
  memorySearchSchema,
  parseWithSchema,
  type MemorySearchPayload
} from "@/lib/utils/validation";

export async function GET(request: Request) {
  try {
    const context = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const payload = parseWithSchema<MemorySearchPayload>(
      memorySearchSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: MemorySearchPayload;
          error?: { flatten: () => unknown };
        };
      },
      {
        q: searchParams.get("q"),
        limit: searchParams.get("limit") ?? undefined
      }
    );
    const results = await searchMemory(context, payload.q, payload.limit);
    return jsonOk({ results });
  } catch (error) {
    return jsonError(error);
  }
}
