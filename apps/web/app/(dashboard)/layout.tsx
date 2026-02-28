import { AuthGate } from "../../components/auth-gate";
import { ProfileChip } from "../../components/profile-chip";
import { RightRail } from "../../components/right-rail";
import { Sidebar } from "../../components/sidebar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507]">
      <div className="pointer-events-none absolute -top-20 right-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-64 w-64 rounded-full bg-[#B994FF]/10 blur-3xl" />

      <div className="relative min-h-screen bg-[#F4F5F7] p-3 sm:p-4 lg:p-5 xl:grid xl:grid-cols-[88px_minmax(0,1fr)] xl:gap-4 2xl:grid-cols-[88px_minmax(0,1fr)_320px]">
          <div className="xl:hidden">
            <Sidebar />
          </div>

          <div className="mt-4 min-w-0 space-y-4 xl:col-start-2 xl:mt-0">
            <div className="hidden items-center justify-between rounded-[20px] border border-black/10 bg-white px-4 py-3 xl:flex">
              <div className="flex h-11 w-full max-w-[520px] items-center rounded-[14px] border border-black/10 bg-[#F8F8F9] px-3">
                <span className="text-[14px] text-[#6E6F75]">Search…</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-[14px] text-[#5D6068]"
                >
                  ✦
                </button>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-[14px] text-[#5D6068]"
                >
                  ⌁
                </button>
                <ProfileChip />
              </div>
            </div>

            <AuthGate>
              <main className="min-w-0 xl:min-h-[calc(100vh-160px)]">{children}</main>
            </AuthGate>
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
