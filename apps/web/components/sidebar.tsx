"use client";

import { getSupabaseClient } from "@chief/data";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandGlyph } from "./brand-glyph";

type IconName =
  | "today"
  | "inbox"
  | "calendar"
  | "tasks"
  | "weekly"
  | "decisions"
  | "settings"
  | "support";

const links = [
  { href: "/today", label: "Today", icon: "today" as IconName },
  { href: "/inbox", label: "Inbox", icon: "inbox" as IconName },
  { href: "/calendar", label: "Calendar", icon: "calendar" as IconName },
  { href: "/tasks", label: "Tasks", icon: "tasks" as IconName },
  { href: "/weekly", label: "Weekly Review", icon: "weekly" as IconName },
  { href: "/decisions", label: "Decisions", icon: "decisions" as IconName }
];

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  const stroke = active ? "#0A0A0D" : "#F4F4F5";
  const opacity = active ? 1 : 0.76;

  if (name === "today") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 8.2 10 3l7 5.2V17H3V8.2Z" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="12.5" rx="2" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <path d="M3 8.5h14" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "inbox") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 6.4A2.4 2.4 0 0 1 5.4 4h9.2A2.4 2.4 0 0 1 17 6.4v7.2a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 13.6V6.4Z"
          stroke={stroke}
          strokeWidth="1.5"
          opacity={opacity}
        />
        <path d="M3.4 6.4 10 11l6.6-4.6" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5.2 6h9.6M5.2 10h9.6M5.2 14h6.6" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <circle cx="4" cy="6" r="1" fill={stroke} opacity={opacity} />
        <circle cx="4" cy="10" r="1" fill={stroke} opacity={opacity} />
        <circle cx="4" cy="14" r="1" fill={stroke} opacity={opacity} />
      </svg>
    );
  }

  if (name === "weekly") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 14.8 7.6 10l3 2.6 4.8-6.2" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <path d="M4 4v12h12" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "decisions") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 2.8 3.6 10H9l-1 7.2L16.4 10H11l1-7.2Z"
          stroke={stroke}
          strokeWidth="1.4"
          opacity={opacity}
        />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="2.8" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <path
          d="M10 3.5v2M10 14.5v2M16.5 10h-2M5.5 10h-2M14.7 5.3l-1.5 1.5M6.8 13.2l-1.5 1.5M14.7 14.7l-1.5-1.5M6.8 6.8 5.3 5.3"
          stroke={stroke}
          strokeWidth="1.5"
          opacity={opacity}
        />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 5.5h11v9h-11z" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      <path d="M7.5 13.5 10 11l2.5 2.5" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.replace("/");
  }

  return (
    <div className="xl:w-[88px]">
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

      <aside className="hidden min-h-full flex-col rounded-[24px] bg-[#0A0A0D] px-2 py-4 xl:flex">
        <div className="mb-6 flex justify-center">
          <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/10">
            <BrandGlyph className="h-8 w-8 text-[#B994FF]" ringClassName="border-[1.8px]" />
          </div>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2.5 overflow-visible">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={`grid h-12 w-full place-items-center rounded-[14px] transition ${
                  active
                    ? "border border-black/10 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.22)]"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <NavIcon name={link.icon} active={active} />
              </Link>
            );
          })}

          <div className="my-3 h-px w-10 bg-white/15" />

          <button
            type="button"
            aria-label="Settings"
            className="grid h-12 w-12 place-items-center rounded-[14px] transition hover:bg-white/10"
          >
            <NavIcon name="settings" active={false} />
          </button>
          <button
            type="button"
            aria-label="Support"
            className="grid h-12 w-12 place-items-center rounded-[14px] transition hover:bg-white/10"
          >
            <NavIcon name="support" active={false} />
          </button>
        </nav>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => void signOut()}
            className="grid h-11 w-11 place-items-center rounded-[14px] border border-white/15 text-white/90 transition hover:bg-white/10"
          >
            ↗
          </button>
        </div>
      </aside>
    </div>
  );
}
