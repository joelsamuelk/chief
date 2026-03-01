import { updateDecisionStatus } from "@/lib/services/decisions";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await parseJson<{ status: "proposed" | "approved" | "implemented" }>(request);
    const decision = updateDecisionStatus(params.id, payload.status);
    return jsonOk({ decision });
  } catch (error) {
    return jsonError(error);
  }
}
