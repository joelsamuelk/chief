import { deleteMeeting, updateMeeting } from "@/lib/services/meetings";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await parseJson<{
      title?: string;
      start_time?: string;
      end_time?: string;
      notes?: string | null;
      attendees?: Array<{ name: string; email?: string }>;
      source_id?: string | null;
    }>(request);

    const meeting = updateMeeting(params.id, payload);
    return jsonOk({ meeting });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const result = deleteMeeting(params.id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
