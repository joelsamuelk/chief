import { jsonError, jsonOk } from "@/lib/server/http";
import { getInboxOverview } from "@/lib/services/inbox";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(request: Request) {
  try {
    const context = await requireAuth(request);
    const overview = await getInboxOverview(context);
    return jsonOk(overview);
  } catch (error) {
    return jsonError(error);
  }
}
