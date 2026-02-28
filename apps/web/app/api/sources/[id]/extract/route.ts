import { jsonError, jsonOk } from "@/lib/server/http";
import { processSource } from "@/lib/services/sources";
import { requireAuth } from "@/lib/utils/auth";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const context = await requireAuth(request);
    const result = await processSource(context, params.id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
