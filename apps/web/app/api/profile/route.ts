import { getOnboardingState } from "@/lib/services/onboarding";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET() {
  try {
    const { profile } = getOnboardingState();
    const fallbackName = profile?.role?.trim() ? `${profile.role} Lead` : "Executive";

    return jsonOk({
      profile: {
        id: "local-user",
        email: "local@chief.app",
        name: fallbackName,
        avatar_url: null,
        onboarding_completed: profile?.onboarding_completed ?? false,
        role: profile?.role ?? null,
        team_size: profile?.team_size ?? null,
        timezone: profile?.timezone ?? "UTC",
        work_start: profile?.work_start ?? null,
        work_end: profile?.work_end ?? null,
        work_days: profile?.work_days ?? [],
        proactivity_level: profile?.proactivity_level ?? "quiet"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
