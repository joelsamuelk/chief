import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { syncSources } from "@/lib/services/sources";
import { requireAuth } from "@/lib/utils/auth";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = await parseJson<{
      provider: "google" | "microsoft";
      org_id?: string | null;
      items: Array<{
        kind: "email" | "meeting" | "shared_text" | "manual";
        external_id: string;
        raw_content: string;
        created_at?: string;
      }>;
    }>(request);

    const sources = await syncSources(context, payload);
    return jsonOk({ sources });
  } catch (error) {
    return jsonError(error);
  }
}
