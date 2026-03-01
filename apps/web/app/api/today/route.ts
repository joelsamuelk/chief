import { jsonError, jsonOk } from "@/lib/server/http";
import { getTodaySnapshot } from "@/lib/services/today";

export async function GET(request: Request) {
  try {
    const today = getTodaySnapshot();
    return jsonOk(today);
  } catch (error) {
    return jsonError(error);
  }
}
