import { jsonError, jsonOk } from "@/lib/server/http";
import { getTodaySnapshot } from "@/lib/services/today";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(request: Request) {
  try {
    const context = await requireAuth(request);
    const today = await getTodaySnapshot(context);
    return jsonOk(today);
  } catch (error) {
    return jsonError(error);
  }
}
