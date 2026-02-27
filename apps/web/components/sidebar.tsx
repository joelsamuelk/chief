"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
  { href: "/weekly", label: "Weekly Review" },
  { href: "/decisions", label: "Decisions" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="xl:w-64">
      <div className="rounded-[24px] bg-surface p-2 shadow-card xl:hidden">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <p className="text-[18px] font-semibold tracking-tight">Chief</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-pill px-4 py-2.5 text-[13px] font-medium transition ${
                  active ? "bg-chipActiveBg text-chipActiveText" : "bg-chipBg text-textSecondary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <aside className="hidden w-64 rounded-[28px] bg-surface p-5 shadow-card xl:block">
        <p className="mb-6 text-[24px] font-semibold tracking-tight">Chief</p>
        <nav className="space-y-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-pill px-4 py-3 text-[14px] font-medium transition ${
                  active ? "bg-chipActiveBg text-chipActiveText" : "text-textSecondary hover:bg-chipBg"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
