import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { processSource } from "@/lib/services/sources";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{ source_id: string }>(request);
    const result = processSource(payload.source_id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
