import { snoozeExtractedItem } from "@/lib/services/queue";
import { jsonError, jsonOk, parseOptionalJson } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await parseOptionalJson<{ snoozed_until?: string | null }>(request, {});
    const until = payload.snoozed_until ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const item = snoozeExtractedItem(params.id, until);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error);
  }
}
