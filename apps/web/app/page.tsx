"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandGlyph, BrandLockup } from "../components/brand-glyph";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [targetPath, setTargetPath] = useState("/app/onboarding");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/onboarding", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { completed?: boolean };
        if (!active) return;
        setTargetPath(payload.completed ? "/app/today" : "/app/onboarding");
      } finally {
        if (active) setChecking(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#efefef] text-[#17191c]">
      <header className="absolute left-6 top-6 z-10">
        <BrandLockup />
      </header>

      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 pb-28 pt-24">
        <section className="rounded-[18px] bg-transparent">
          <h1 className="text-center text-[40px] font-semibold tracking-tight text-[#17191c] sm:text-[48px]">
            Welcome to chief
          </h1>
          <p className="mt-2 text-center text-[16px] text-[#6a6a6a] sm:text-[20px]">
            Executive clarity infrastructure for teams and individuals
          </p>

          <div className="mt-12 space-y-4">
            <button
              type="button"
              disabled={checking}
              onClick={() => router.push(targetPath)}
              className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#111418] text-[18px] font-semibold text-white transition hover:bg-black disabled:opacity-70 sm:text-[24px]"
            >
              {checking ? "Loading workspace..." : "Enter workspace"}
            </button>
          </div>

          <p className="mx-auto mt-16 max-w-[640px] text-center text-[13px] leading-[1.45] text-[#666] sm:mt-24 sm:text-[18px]">
            Local mode is active. Data stays on this device until you reset or export.
          </p>
        </section>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 bg-[#1f2023] px-6 py-5 text-white">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/90 text-[#1f2023]">
              <BrandGlyph className="h-7 w-7 text-[#1f2023]" ringClassName="border-[1.7px]" />
            </span>
            <span className="text-[24px] font-semibold tracking-tight sm:text-[34px]">chief</span>
          </div>
          <p className="text-[14px] font-medium text-white/90 sm:text-[22px]">local executive OS</p>
        </div>
      </footer>
    </div>
  );
}
