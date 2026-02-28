"use client";

import { getSupabaseClient } from "@chief/data";
import { useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";

export function AuthGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      if (!data.session) {
        router.replace("/");
        return;
      }

      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/");
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-[20px] bg-white/80 text-[14px] text-[#5b5e66]">
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}
