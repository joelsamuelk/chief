import { createDecision, listDecisionLedger } from "@/lib/services/decision-service";
import { jsonOk, parseJson, withAuthedRoute } from "@/lib/server/http";

export async function GET(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const decisions = await listDecisionLedger(context);
    return jsonOk({ decisions });
  });
}

export async function POST(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const payload = await parseJson<{
      title: string;
      context?: string | null;
      owner?: string | null;
      related_meeting_id?: string | null;
      status?: "proposed" | "approved" | "implemented";
      org_id?: string | null;
      source_id?: string | null;
      task_ids?: string[];
    }>(request);

    const decision = await createDecision(context, payload);
    return jsonOk({ decision }, { status: 201 });
  });
}
