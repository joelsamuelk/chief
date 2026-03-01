"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandGlyph } from "./brand-glyph";

type IconName =
  | "today"
  | "queue"
  | "tasks"
  | "meetings"
  | "memory"
  | "team"
  | "decisions"
  | "assist"
  | "settings";

interface NavLink {
  href: string;
  label: string;
  icon: IconName;
  mobile?: boolean;
}

const desktopLinks: NavLink[] = [
  { href: "/app/today", label: "Today", icon: "today", mobile: true },
  { href: "/app/queue", label: "Action Queue", icon: "queue", mobile: true },
  { href: "/app/tasks", label: "Tasks", icon: "tasks", mobile: true },
  { href: "/app/meetings", label: "Meetings", icon: "meetings" },
  { href: "/app/memory", label: "Memory", icon: "memory" },
  { href: "/app/team", label: "Team", icon: "team" },
  { href: "/app/decisions", label: "Decisions", icon: "decisions" },
  { href: "/app/assist", label: "Assist", icon: "assist", mobile: true },
  { href: "/app/settings", label: "Settings", icon: "settings" }
];

const mobileLinks = desktopLinks.filter((link) => link.mobile);

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  const stroke = active ? "#0A0A0D" : "#F4F4F5";
  const opacity = active ? 1 : 0.78;

  if (name === "today") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 8.2 10 3l7 5.2V17H3V8.2Z" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "queue") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5.2 6h9.6M5.2 10h9.6M5.2 14h6.6" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <circle cx="4" cy="6" r="1" fill={stroke} opacity={opacity} />
        <circle cx="4" cy="10" r="1" fill={stroke} opacity={opacity} />
        <circle cx="4" cy="14" r="1" fill={stroke} opacity={opacity} />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="12" rx="2" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <path d="M6 8h8M6 11h8M6 14h5" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "meetings") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="14" height="13" rx="2" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <path d="M3 8h14M7 3v3M13 3v3" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "memory") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 5.5a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 16 5.5v9A2.5 2.5 0 0 1 13.5 17h-7A2.5 2.5 0 0 1 4 14.5v-9Z" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <path d="M7 7.5h6M7 10h6M7 12.5h4" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

  if (name === "team") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="7" cy="8" r="2" stroke={stroke} strokeWidth="1.4" opacity={opacity} />
        <circle cx="13" cy="8" r="2" stroke={stroke} strokeWidth="1.4" opacity={opacity} />
        <path d="M3.8 15c.5-2.1 2-3.2 3.8-3.2s3.3 1.1 3.8 3.2M8.5 15c.5-2.1 2-3.2 3.8-3.2s3.3 1.1 3.8 3.2" stroke={stroke} strokeWidth="1.4" opacity={opacity} />
      </svg>
    );
  }

  if (name === "decisions") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.8 3.6 10H9l-1 7.2L16.4 10H11l1-7.2Z" stroke={stroke} strokeWidth="1.4" opacity={opacity} />
      </svg>
    );
  }

  if (name === "assist") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3.5v3M10 13.5v3M3.5 10h3M13.5 10h3" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
        <circle cx="10" cy="10" r="3.2" stroke={stroke} strokeWidth="1.5" opacity={opacity} />
      </svg>
    );
  }

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

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="xl:w-[88px]">
      <div className="rounded-[24px] bg-surface p-2 shadow-card xl:hidden">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <p className="text-[18px] font-semibold tracking-tight">Chief</p>
        </div>
        <nav className="grid grid-cols-4 gap-2">
          {mobileLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`grid h-11 place-items-center rounded-[12px] text-[12px] font-medium transition ${
                  active ? "bg-chipActiveBg text-chipActiveText" : "bg-chipBg text-textSecondary"
                }`}
              >
                {link.label.split(" ")[0]}
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
          {desktopLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                title={link.label}
                className={`grid h-12 w-full place-items-center rounded-[14px] transition ${
                  active
                    ? "bg-white text-[#0A0A0D] shadow-[0_8px_20px_rgba(0,0,0,0.22)]"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <NavIcon name={link.icon} active={active} />
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => router.replace("/")}
            className="grid h-11 w-11 place-items-center rounded-[14px] border border-white/15 text-white/90 transition hover:bg-white/10"
          >
            ↗
          </button>
        </div>
      </aside>
    </div>
  );
}
