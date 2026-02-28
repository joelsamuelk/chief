import { detectRisks } from "@/lib/services/risk-service";
import { jsonOk, withAuthedRoute } from "@/lib/server/http";

export async function GET(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const risks = await detectRisks(context);
    return jsonOk({ risks });
  });
}
