import { createDecision, getDecisions } from "@/lib/services/decisions";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const decisions = getDecisions();
    return jsonOk({ decisions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      title: string;
      context?: string | null;
      owner?: string | null;
      related_meeting_id?: string | null;
      status?: "proposed" | "approved" | "implemented";
      source_id?: string | null;
    }>(request);

    const decision = createDecision(payload);
    return jsonOk({ decision }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
