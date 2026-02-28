import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null | undefined;

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export function getSupabaseClient() {
  if (singleton !== undefined) return singleton;

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
