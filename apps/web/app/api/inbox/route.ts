import { jsonError, jsonOk } from "@/lib/server/http";
import { getInboxOverview } from "@/lib/services/inbox";

export async function GET(request: Request) {
  try {
    const overview = getInboxOverview();
    return jsonOk(overview);
  } catch (error) {
    return jsonError(error);
  }
}
