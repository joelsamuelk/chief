import { acceptExtractedDecision } from "@/lib/services/decisions";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      extracted_item_id: string;
    }>(request);

    const decision = acceptExtractedDecision(payload.extracted_item_id);
    return jsonOk({ decision });
  } catch (error) {
    return jsonError(error);
  }
}
