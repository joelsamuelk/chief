import { getTeamOverview } from "@/lib/services/team";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const overview = getTeamOverview();
    return jsonOk(overview);
  } catch (error) {
    return jsonError(error);
  }
}
