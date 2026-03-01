import {
  completeOnboarding,
  getOnboardingState,
  saveProactivityLevel,
  saveWorkHours,
  saveWorkProfile
} from "@/lib/services/onboarding";
import { jsonError, jsonOk, parseOptionalJson } from "@/lib/server/http";
import type { ProactivityLevel } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OnboardingAction = "work_profile" | "work_hours" | "proactivity" | "complete";

export async function GET() {
  try {
    return jsonOk(getOnboardingState());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseOptionalJson<{
      action?: OnboardingAction;
      role?: string;
      team_size?: number;
      timezone?: string;
      work_start?: string;
      work_end?: string;
      work_days?: string[];
      proactivity_level?: ProactivityLevel;
    }>(request, {});

    if (payload.action === "work_profile") {
      if (!payload.role || !payload.timezone || typeof payload.team_size !== "number") {
        throw new Error("role, team_size, and timezone are required.");
      }
      const profile = saveWorkProfile({
        role: payload.role,
        team_size: payload.team_size,
        timezone: payload.timezone
      });
      return jsonOk({ profile });
    }

    if (payload.action === "work_hours") {
      if (!payload.work_start || !payload.work_end || !Array.isArray(payload.work_days)) {
        throw new Error("work_start, work_end, and work_days are required.");
      }
      const profile = saveWorkHours({
        work_start: payload.work_start,
        work_end: payload.work_end,
        work_days: payload.work_days
      });
      return jsonOk({ profile });
    }

    if (payload.action === "proactivity") {
      if (!payload.proactivity_level) {
        throw new Error("proactivity_level is required.");
      }
      const profile = saveProactivityLevel(payload.proactivity_level);
      return jsonOk({ profile });
    }

    if (payload.action === "complete") {
      const profile = completeOnboarding();
      return jsonOk({ profile });
    }

    throw new Error("Unsupported onboarding action.");
  } catch (error) {
    return jsonError(error);
  }
}
