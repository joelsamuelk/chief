import { ProfileChip } from "../../../components/profile-chip";
import { RightRail } from "../../../components/right-rail";
import { Sidebar } from "../../../components/sidebar";
import { getOnboardingState } from "@/lib/services/onboarding";
import { runDigestScheduler } from "@/lib/services/notifications";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AppProtectedLayout({ children }: { children: ReactNode }) {
  const state = getOnboardingState();
  if (!state.completed) {
    redirect("/app/onboarding");
  }

  try {
    runDigestScheduler();
  } catch {
    // Digest auto-generation should never block shell rendering.
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507]">
      <div className="pointer-events-none absolute -top-20 right-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

      <div className="relative min-h-screen bg-[#F4F5F7] p-3 sm:p-4 lg:p-5 xl:grid xl:grid-cols-[88px_minmax(0,1fr)] xl:gap-4 2xl:grid-cols-[88px_minmax(0,1fr)_320px]">
        <div className="xl:hidden">
          <Sidebar />
        </div>

        <div className="mt-4 min-w-0 space-y-4 xl:col-start-2 xl:mt-0">
          <div className="hidden items-center justify-between rounded-[20px] border border-black/10 bg-white px-4 py-3 xl:flex">
            <div className="flex h-11 w-full max-w-[520px] items-center rounded-[14px] border border-black/10 bg-[#F8F8F9] px-3">
              <span className="text-[14px] text-[#6E6F75]">Search...</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/app/assist"
                aria-label="Open Chief Assist"
                title="Chief Assist"
                className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-[14px] text-[#5D6068]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
                </svg>
              </Link>
              <Link
                href="/app/settings#notifications"
                aria-label="Open Notifications Settings"
                title="Notifications"
                className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-[14px] text-[#5D6068]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 17H5.5A1.5 1.5 0 0 1 4 15.5V11a8 8 0 0 1 16 0v4.5a1.5 1.5 0 0 1-1.5 1.5H15z" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
              </Link>
              <ProfileChip />
            </div>
          </div>

          <main className="min-w-0 xl:min-h-[calc(100vh-160px)]">{children}</main>
        </div>

        <div className="mt-4 hidden xl:col-start-1 xl:row-start-1 xl:mt-0 xl:block">
          <Sidebar />
        </div>

        <div className="mt-4 xl:col-span-2 2xl:col-span-1 2xl:col-start-3 2xl:mt-0">
          <RightRail />
        </div>
      </div>
    </div>
  );
}
