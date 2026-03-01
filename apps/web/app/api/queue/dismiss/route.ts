import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { dismissExtractedItem } from "@/lib/services/queue";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{ id: string }>(request);
    const item = dismissExtractedItem(payload.id);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error);
  }
}
