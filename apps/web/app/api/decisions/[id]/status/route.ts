import { updateDecisionStatus } from "@/lib/services/decision-service";
import { jsonOk, parseJson, withAuthedRoute } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withAuthedRoute(request, async (context) => {
    const payload = await parseJson<{ status: "proposed" | "approved" | "implemented" }>(request);
    const decision = await updateDecisionStatus(context, params.id, payload.status);
    return jsonOk({ decision });
  });
}
