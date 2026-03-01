import { detectRisks } from "@/lib/services/today";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const risks = detectRisks();
    return jsonOk({ risks });
  } catch (error) {
    return jsonError(error);
  }
}
