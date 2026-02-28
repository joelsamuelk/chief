import { getTeamOverview } from "@/lib/services/team-service";
import { jsonOk, withAuthedRoute } from "@/lib/server/http";

export async function GET(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const overview = await getTeamOverview(context);
    return jsonOk(overview);
  });
}
