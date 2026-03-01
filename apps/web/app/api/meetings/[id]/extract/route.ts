import { runExtractionOnMeetingNotes } from "@/lib/services/meetings";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const result = runExtractionOnMeetingNotes(params.id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
