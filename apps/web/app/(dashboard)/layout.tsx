import { RightRail } from "../../components/right-rail";
import { Sidebar } from "../../components/sidebar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-4 sm:p-screen">
      <div className="mx-auto max-w-[1480px] space-y-4 xl:grid xl:grid-cols-[256px_minmax(0,1fr)_320px] xl:gap-5 xl:space-y-0">
        <Sidebar />
        <main className="min-w-0 xl:min-h-[calc(100vh-40px)]">{children}</main>
        <RightRail />
      </div>
    </div>
  );
}
