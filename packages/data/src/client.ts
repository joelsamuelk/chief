import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null | undefined;

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

function parseBooleanFlag(value: string | undefined) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function supabaseIsEnabledByEnv() {
  const nextPublicFlag =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_USE_SUPABASE : undefined;
  const expoPublicFlag =
    typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_USE_SUPABASE : undefined;

  const resolved = parseBooleanFlag(nextPublicFlag ?? expoPublicFlag);
  if (resolved !== null) return resolved;

  // Default to local-first while building. Set NEXT_PUBLIC_USE_SUPABASE=true to re-enable.
  return false;
}

export function getSupabaseClient() {
  if (singleton !== undefined) return singleton;

  if (!supabaseIsEnabledByEnv()) {
    singleton = null;
    return singleton;
  }

  const nextPublicUrl =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_SUPABASE_URL : undefined;
  const nextPublicAnon =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined;
  const expoPublicUrl =
    typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_URL : undefined;
  const expoPublicAnon =
    typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY : undefined;

  const url = nextPublicUrl ?? expoPublicUrl;
  const anonKey = nextPublicAnon ?? expoPublicAnon;
  const isWeb = Boolean(nextPublicUrl);

  if (!url || !anonKey) {
    singleton = null;
    return singleton;
  }

  singleton = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: isWeb
    }
  });

  return singleton;
}
