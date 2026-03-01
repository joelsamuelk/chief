import { dismissExtractedItem } from "@/lib/services/queue";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const item = dismissExtractedItem(params.id);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error);
  }
}
