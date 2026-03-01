import { buildMeetingPreBrief } from "@/lib/services/meetings";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meeting_id") ?? undefined;
    const prebrief = buildMeetingPreBrief(meetingId);
    return jsonOk({ prebrief });
  } catch (error) {
    return jsonError(error);
  }
}
