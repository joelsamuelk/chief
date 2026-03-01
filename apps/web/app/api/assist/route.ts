import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { handleAssistQuery } from "@/lib/services/assist";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{ query: string; meeting_id?: string }>(request);
    const assist = handleAssistQuery(payload.query, payload.meeting_id);
    return jsonOk(assist);
  } catch (error) {
    return jsonError(error);
  }
}
