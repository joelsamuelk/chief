import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { importSampleEmails, importSampleMeetings } from "@/lib/services/sources";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      mode: "emails" | "meetings";
    }>(request);

    const sources = payload.mode === "meetings" ? importSampleMeetings() : importSampleEmails();
    return jsonOk({ sources });
  } catch (error) {
    return jsonError(error);
  }
}
