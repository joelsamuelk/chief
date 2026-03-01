"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface UserIdentity {
  name: string;
  initial: string;
  avatarUrl: string | null;
}

function fallbackIdentity(): UserIdentity {
  return {
    name: "Executive",
    initial: "E",
    avatarUrl: null
  };
}

export function ProfileChip() {
  const [identity, setIdentity] = useState<UserIdentity>(fallbackIdentity);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/profile", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          profile?: { name?: string | null; avatar_url?: string | null };
        };

        const name = payload.profile?.name?.trim() || "Executive";
        if (!active) return;

        setIdentity({
          name,
          initial: name.slice(0, 1).toUpperCase() || "E",
          avatarUrl: payload.profile?.avatar_url ?? null
        });
      } catch {
        if (active) {
          setIdentity(fallbackIdentity());
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      href="/app/settings"
      className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1 transition hover:bg-[#F6F7F8]"
    >
      {identity.avatarUrl ? (
        <img
          src={identity.avatarUrl}
          alt={identity.name}
          className="h-8 w-8 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E5E7EB] text-[12px] font-semibold">
          {identity.initial}
        </span>
      )}
      <span className="max-w-[120px] truncate text-[13px] font-medium text-[#252830]">{identity.name}</span>
    </Link>
  );
}
