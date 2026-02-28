import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { createSource } from "@/lib/services/sources";
import { requireAuth } from "@/lib/utils/auth";
import {
  parseWithSchema,
  sourceCreateSchema,
  type SourceCreatePayload
} from "@/lib/utils/validation";

export async function GET(request: Request) {
  try {
    const context = await requireAuth(request);
    const { data, error } = await context.supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return jsonOk({ sources: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<SourceCreatePayload>(
      sourceCreateSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: SourceCreatePayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );
    const source = await createSource(context, payload);
    return jsonOk({ source }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
