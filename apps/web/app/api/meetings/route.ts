import { createMeeting, getMeetings, type MeetingFilter } from "@/lib/services/meetings";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";

const allowedFilters: MeetingFilter[] = ["all", "upcoming", "past"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterParam = (searchParams.get("filter") ?? "all") as MeetingFilter;
    const filter = allowedFilters.includes(filterParam) ? filterParam : "all";
    const meetings = getMeetings(filter);
    return jsonOk({ meetings, filter });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      title: string;
      start_time: string;
      end_time: string;
      notes?: string | null;
      attendees?: Array<{ name: string; email?: string }>;
      source_id?: string | null;
    }>(request);

    const meeting = createMeeting({
      title: payload.title,
      start_time: payload.start_time,
      end_time: payload.end_time,
      notes: payload.notes ?? null,
      attendees: payload.attendees ?? [],
      source_id: payload.source_id ?? null
    });

    return jsonOk({ meeting }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
