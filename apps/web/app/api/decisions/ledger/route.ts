import { getDecisionLedger } from "@/lib/services/decisions";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const decisions = getDecisionLedger();
    return jsonOk({ decisions });
  } catch (error) {
    return jsonError(error);
  }
}
