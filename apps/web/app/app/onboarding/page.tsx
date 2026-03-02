"use client";

import { Card } from "@chief/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getTimezoneOptions } from "@/lib/timezones";

type ProactivityLevel = "reactive" | "quiet" | "strong";

const workingDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

interface OnboardingProfile {
  role: string | null;
  team_size: number | null;
  timezone: string;
  work_start: string | null;
  work_end: string | null;
  work_days: string[];
  proactivity_level: ProactivityLevel;
  onboarding_completed: boolean;
}

function stepTitle(step: number) {
  if (step === 0) return "Welcome";
  if (step === 1) return "Work profile";
  if (step === 2) return "Work hours";
  if (step === 3) return "Proactivity";
  return "Setup complete";
}

function normalizeTime(value: string, fallback: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return fallback;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return fallback;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState("");
  const [teamSize, setTeamSize] = useState(5);
  const [timezone, setTimezone] = useState("UTC");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:30");
  const [workDays, setWorkDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [proactivity, setProactivity] = useState<ProactivityLevel>("quiet");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/onboarding", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          completed?: boolean;
          profile?: OnboardingProfile | null;
        };

        if (!active) return;

        if (payload.completed) {
          router.replace("/app/today");
          return;
        }

        const profile = payload.profile;
        if (profile) {
          setRole(profile.role ?? "");
          setTeamSize(profile.team_size ?? 5);
          setTimezone(profile.timezone || "UTC");
          setWorkStart(profile.work_start ?? "09:00");
          setWorkEnd(profile.work_end ?? "17:30");
          setWorkDays(profile.work_days.length > 0 ? profile.work_days : ["Mon", "Tue", "Wed", "Thu", "Fri"]);
          setProactivity(profile.proactivity_level ?? "quiet");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  const timezoneOptions = useMemo(() => {
    const inferred = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return getTimezoneOptions(inferred, timezone);
  }, [timezone]);
  const normalizedWorkStart = normalizeTime(workStart, "09:00");
  const normalizedWorkEnd = normalizeTime(workEnd, "17:30");
  const [workStartHour, workStartMinute] = normalizedWorkStart.split(":");
  const [workEndHour, workEndMinute] = normalizedWorkEnd.split(":");

  function toggleDay(day: string) {
    setWorkDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== day);
      }
      return [...current, day];
    });
  }

  async function persistCurrentStep(targetStep: number) {
    setSaving(true);
    setError(null);
    try {
      if (step === 1) {
        if (!role.trim()) {
          throw new Error("Role is required.");
        }
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "work_profile",
            role: role.trim(),
            team_size: teamSize,
            timezone: timezone.trim() || "UTC"
          })
        });
        if (!response.ok) throw new Error("Unable to save work profile.");
      }

      if (step === 2) {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "work_hours",
            work_start: workStart,
            work_end: workEnd,
            work_days: workDays
          })
        });
        if (!response.ok) throw new Error("Unable to save work hours.");
      }

      if (step === 3) {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "proactivity",
            proactivity_level: proactivity
          })
        });
        if (!response.ok) throw new Error("Unable to save proactivity level.");
      }

      setStep(targetStep);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to continue.");
    } finally {
      setSaving(false);
    }
  }

  async function finishSetup() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "complete" })
      });
      if (!response.ok) {
        throw new Error("Unable to complete onboarding.");
      }
      window.location.assign("/app/today");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to finish setup.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F4F5F7] text-[14px] text-textSecondary">
        Loading onboarding...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[760px] space-y-4">
        <p className="text-[13px] uppercase tracking-[0.12em] text-textSecondary">Step {step + 1} of 5</p>
        <h1 className="text-[30px] font-semibold text-textPrimary">{stepTitle(step)}</h1>

        <Card className="space-y-4 border border-black/10 p-6 shadow-none">
          {step === 0 ? (
            <>
              <p className="text-[15px] text-textSecondary">
                Chief structures your day around decisions, delegation, and execution.
              </p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-11 rounded-[12px] bg-[#111418] px-5 text-[14px] font-semibold text-white"
              >
                Start setup
              </button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <label className="block text-[13px] font-medium text-textPrimary">
                Role
                <input
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-1 h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[14px]"
                  placeholder="Founder, CEO, COO"
                />
              </label>

              <label className="block text-[13px] font-medium text-textPrimary">
                Team size
                <input
                  type="number"
                  min={1}
                  value={teamSize}
                  onChange={(event) => setTeamSize(Number(event.target.value) || 1)}
                  className="mt-1 h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[14px]"
                />
              </label>

              <label className="block text-[13px] font-medium text-textPrimary">
                Timezone
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="chief-select mt-1 h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[14px]"
                >
                  {timezoneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[13px] font-medium text-textPrimary">
                  Work start
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={workStartHour}
                      onChange={(event) => setWorkStart(`${event.target.value}:${workStartMinute}`)}
                      className="chief-select h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[14px]"
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span className="text-[14px] text-textSecondary">:</span>
                    <select
                      value={workStartMinute}
                      onChange={(event) => setWorkStart(`${workStartHour}:${event.target.value}`)}
                      className="chief-select h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[14px]"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="block text-[13px] font-medium text-textPrimary">
                  Work end
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={workEndHour}
                      onChange={(event) => setWorkEnd(`${event.target.value}:${workEndMinute}`)}
                      className="chief-select h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[14px]"
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span className="text-[14px] text-textSecondary">:</span>
                    <select
                      value={workEndMinute}
                      onChange={(event) => setWorkEnd(`${workEndHour}:${event.target.value}`)}
                      className="chief-select h-11 w-full rounded-[10px] border border-black/10 bg-white px-3 text-[14px]"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <div>
                <p className="text-[13px] font-medium text-textPrimary">Working days</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {workingDays.map((day) => {
                    const active = workDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`h-9 rounded-pill px-3 text-[12px] font-medium ${
                          active ? "bg-chipActiveBg text-chipActiveText" : "bg-chipBg text-textSecondary"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="text-[13px] text-textSecondary">Choose how proactive Chief should be with digests.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  { value: "reactive", label: "Reactive", detail: "In-app only" },
                  { value: "quiet", label: "Quiet", detail: "Morning + risk" },
                  { value: "strong", label: "Strong", detail: "Morning + risk + stuck" }
                ] as const).map((option) => {
                  const active = proactivity === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProactivity(option.value)}
                      className={`rounded-[12px] border p-3 text-left ${
                        active
                          ? "border-[#111418] bg-[#111418] text-white"
                          : "border-black/10 bg-white text-textPrimary"
                      }`}
                    >
                      <p className="text-[14px] font-semibold">{option.label}</p>
                      <p className="text-[12px] opacity-80">{option.detail}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <p className="text-[14px] text-textSecondary">
                Your executive operating system is configured. You can adjust preferences in settings.
              </p>
              <button
                type="button"
                onClick={() => void finishSetup()}
                disabled={saving}
                className="h-11 rounded-[12px] bg-[#111418] px-5 text-[14px] font-semibold text-white disabled:opacity-70"
              >
                {saving ? "Finishing..." : "Enter Chief"}
              </button>
            </>
          ) : null}

          {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

          {step > 0 && step < 4 ? (
            <div className="flex items-center justify-between border-t border-black/10 pt-4">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="h-10 rounded-[10px] border border-black/10 px-4 text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void persistCurrentStep(step + 1)}
                className="h-10 rounded-[10px] bg-[#111418] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
              >
                {saving ? "Saving..." : "Continue"}
              </button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
