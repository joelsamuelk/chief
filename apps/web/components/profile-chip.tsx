"use client";

import { getSupabaseClient } from "@chief/data";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface UserIdentity {
  name: string;
  initial: string;
  avatarUrl: string | null;
}

function fallbackIdentity(): UserIdentity {
  return {
    name: "Profile",
    initial: "P",
    avatarUrl: null
  };
}

function toIdentity(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): UserIdentity {
  if (!user) return fallbackIdentity();

  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0
      ? metadata.full_name.trim()
      : typeof metadata.name === "string" && metadata.name.trim().length > 0
        ? metadata.name.trim()
        : user.email?.split("@")[0]?.trim() || "Profile";

  const avatarFromMetadata =
    typeof metadata.avatar_url === "string" && metadata.avatar_url.trim().length > 0
      ? metadata.avatar_url.trim()
      : typeof metadata.picture === "string" && metadata.picture.trim().length > 0
        ? metadata.picture.trim()
        : null;

  return {
    name: fullName,
    initial: fullName.slice(0, 1).toUpperCase() || "P",
    avatarUrl: avatarFromMetadata
  };
}

export function ProfileChip() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [identity, setIdentity] = useState<UserIdentity>(fallbackIdentity);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;

    async function loadUser() {
      const { data } = await client.auth.getUser();
      if (!active) return;
      setIdentity(toIdentity(data.user ?? null));
    }

    void loadUser();

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setIdentity(toIdentity(session?.user ?? null));
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <Link
      href="/profile"
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
