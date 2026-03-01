import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { createSource, listSources } from "@/lib/services/sources";

export async function GET(request: Request) {
  try {
    const sources = listSources();
    return jsonOk({ sources });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      kind: "email" | "meeting" | "shared_text" | "manual_note";
      provider: string;
      external_id?: string | null;
      raw_content: string;
    }>(request);

    const created = createSource({
      kind: payload.kind,
      provider: payload.provider,
      external_id: payload.external_id ?? null,
      raw_content: payload.raw_content
    });
    return jsonOk({ source: created.source, duplicate: created.duplicate }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
