"use client";

import { getSupabaseClient } from "@chief/data";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrandGlyph, BrandLockup } from "../components/brand-glyph";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436a4.1382 4.1382 0 0 1-1.7954 2.7164v2.2582h2.9082c1.7018-1.5664 2.6836-3.8746 2.6836-6.6155Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8055 5.9564-2.1791l-2.9082-2.2582c-.8055.54-1.8368.8591-3.0482.8591-2.3468 0-4.3336-1.5859-5.0431-3.716L.9573 12.9991A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.9569 10.7058A5.4106 5.4106 0 0 1 3.6764 9c0-.5927.1023-1.1682.2805-1.7058V5.0009H.9573A9 9 0 0 0 0 9c0 1.4518.3477 2.8268.9573 3.9991l2.9996-2.2933Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5782c1.3214 0 2.5082.4541 3.4418 1.3459l2.5814-2.5814C13.4627.8918 11.4259 0 9 0A9 9 0 0 0 .9573 5.0009l2.9996 2.2933C4.6664 5.1641 6.6532 3.5782 9 3.5782Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const localBuildMode = !supabase;

  const [email, setEmail] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted && data.session) {
        router.replace("/today");
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        router.replace("/today");
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function signInWithGoogle() {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setInfoMessage("Running in local build mode. Supabase auth is paused.");
      return;
    }

    setIsGoogleLoading(true);
    const redirectTo = `${window.location.origin}/today`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    if (error) {
      setErrorMessage(error.message);
      setIsGoogleLoading(false);
      return;
    }
  }

  async function signInWithApple() {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setInfoMessage("Running in local build mode. Supabase auth is paused.");
      return;
    }

    setIsAppleLoading(true);
    const redirectTo = `${window.location.origin}/today`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo }
    });

    if (error) {
      setErrorMessage(error.message);
      setIsAppleLoading(false);
      return;
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setInfoMessage("Running in local build mode. Supabase auth is paused.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    setIsEmailLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/today`
      }
    });

    setIsEmailLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setInfoMessage("Check your email for a secure sign-in link.");
  }

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

          <div className="mt-12 space-y-5">
            {localBuildMode ? (
              <button
                type="button"
                onClick={() => router.push("/today")}
                className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#111418] text-[18px] font-semibold text-white transition hover:bg-black sm:text-[24px]"
              >
                Continue in local build mode
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={localBuildMode || isGoogleLoading || isAppleLoading || isEmailLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#d2d2d2] bg-[#f4f4f4] text-[18px] font-medium text-[#202327] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:text-[24px]"
            >
              <GoogleIcon />
              {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={() => void signInWithApple()}
              disabled={localBuildMode || isGoogleLoading || isAppleLoading || isEmailLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#d2d2d2] bg-[#f4f4f4] text-[18px] font-medium text-[#202327] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:text-[24px]"
            >
              {isAppleLoading ? "Redirecting..." : "Continue with Apple"}
            </button>

            <div className="h-px bg-[#d7d7d7]" />

            <form onSubmit={(event) => void signInWithEmail(event)} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-[15px] font-medium text-[#23262b] sm:text-[20px]">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Type your email"
                  className="h-12 w-full rounded-[10px] border border-[#d2d2d2] bg-[#f4f4f4] px-4 text-[16px] text-[#111] placeholder:text-[#9a9a9a] outline-none transition focus:border-[#111] sm:text-[20px]"
                />
              </div>

              <button
                type="submit"
                disabled={localBuildMode || isGoogleLoading || isAppleLoading || isEmailLoading}
                className="h-12 w-full rounded-[10px] bg-[#111418] text-[18px] font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70 sm:text-[24px]"
              >
                {isEmailLoading ? "Sending link..." : "Continue with email"}
              </button>
            </form>

            {errorMessage ? <p className="text-[13px] font-medium text-[#b42318]">{errorMessage}</p> : null}
            {infoMessage ? <p className="text-[13px] font-medium text-[#106C2A]">{infoMessage}</p> : null}
          </div>

          <p className="mx-auto mt-16 max-w-[640px] text-center text-[13px] leading-[1.45] text-[#666] sm:mt-24 sm:text-[18px]">
            By clicking "Sign in with Google", "Continue with Apple", or "Continue with email" you agree to our{" "}
            <a href="#" className="underline underline-offset-4">
              Terms of Use
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4">
              Privacy policy
            </a>
            .
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
          <p className="text-[14px] font-medium text-white/90 sm:text-[22px]">
            curated by <span className="font-semibold">Chief</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
