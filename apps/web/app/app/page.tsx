import { getOnboardingState } from "@/lib/services/onboarding";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AppIndexPage() {
  const state = getOnboardingState();
  redirect(state.completed ? "/app/today" : "/app/onboarding");
}
