import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { handleAssistQuery } from "@/lib/services/assist";

interface AssistAppContextPayload {
  path?: string;
  section?: string;
}

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{ query: string; meeting_id?: string; app_context?: AssistAppContextPayload }>(request);
    const assist = handleAssistQuery(payload.query, payload.meeting_id, payload.app_context);
    return jsonOk(assist);
  } catch (error) {
    return jsonError(error);
  }
}
