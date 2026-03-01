import { getDefaultContext, getRepos } from "../storage";
import type { Profile, ProactivityLevel } from "../storage";

export function getOnboardingState() {
  const repos = getRepos();
  const context = getDefaultContext();
  const profile = repos.profile.get(context);
  return {
    completed: profile?.onboarding_completed ?? false,
    profile
  };
}

export function saveWorkProfile(input: { role: string; team_size: number; timezone: string }): Profile {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.profile.upsert(context, {
    role: input.role.trim(),
    team_size: input.team_size,
    timezone: input.timezone.trim() || "UTC"
  });
}

export function saveWorkHours(input: {
  work_start: string;
  work_end: string;
  work_days: string[];
}): Profile {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.profile.upsert(context, {
    work_start: input.work_start,
    work_end: input.work_end,
    work_days: input.work_days
  });
}

export function saveProactivityLevel(level: ProactivityLevel): Profile {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.profile.upsert(context, {
    proactivity_level: level
  });
}

export function completeOnboarding(): Profile {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.profile.upsert(context, {
    onboarding_completed: true
  });
}
