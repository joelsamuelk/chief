import { jsonError, jsonOk, parseOptionalJson } from "@/lib/server/http";
import {
  generateEodRecap,
  generateMorningBrief,
  getNotificationPreferences,
  listDigests,
  runDigestScheduler,
  setProactivityLevel
} from "@/lib/services/notifications";
import type { ProactivityLevel } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    runDigestScheduler();
    const plan = getNotificationPreferences();
    const digests = listDigests();
    return jsonOk({ plan, digests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseOptionalJson<{
      action?: "morning" | "eod" | "set_proactivity";
      proactivity_level?: ProactivityLevel;
    }>(request, {});

    if (payload.action === "set_proactivity" && payload.proactivity_level) {
      const profile = setProactivityLevel(payload.proactivity_level);
      return jsonOk({ profile });
    }

    if (payload.action === "eod") {
      return jsonOk(generateEodRecap());
    }

    return jsonOk(generateMorningBrief());
  } catch (error) {
    return jsonError(error);
  }
}
