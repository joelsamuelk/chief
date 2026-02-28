import { listDecisionLedger } from "@/lib/services/decision-service";
import { jsonOk, withAuthedRoute } from "@/lib/server/http";

export async function GET(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const decisions = await listDecisionLedger(context);
    return jsonOk({ decisions });
  });
}
