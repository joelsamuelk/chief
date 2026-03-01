import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { snoozeExtractedItem } from "@/lib/services/queue";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{ id: string; until: string }>(request);
    const item = snoozeExtractedItem(payload.id, payload.until);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error);
  }
}
