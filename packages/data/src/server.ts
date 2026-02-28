import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_USER_ID } from "./seed";

export interface ServerAuthContext {
  userId: string;
  orgId: string | null;
  accessToken: string | null;
  supabase: SupabaseClient | null;
  serviceSupabase: SupabaseClient | null;
  localMode: boolean;
}

function getEnv() {
  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? null,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    nodeEnv: env.NODE_ENV ?? "development"
  };
}

export function getAccessTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function createUserClient(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

export function createServiceRoleClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getEnv();
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export async function getServerAuthContext(request: Request): Promise<ServerAuthContext> {
  const accessToken = getAccessTokenFromRequest(request);
  const serviceSupabase = createServiceRoleClient();

  if (!accessToken) {
    const fallbackUser = request.headers.get("x-user-id") ?? DEMO_USER_ID;
    return {
      userId: fallbackUser,
      orgId: request.headers.get("x-org-id"),
      accessToken: null,
      supabase: null,
      serviceSupabase,
      localMode: true
    };
  }

  const supabase = createUserClient(accessToken);
  if (!supabase) {
    return {
      userId: request.headers.get("x-user-id") ?? DEMO_USER_ID,
      orgId: request.headers.get("x-org-id"),
      accessToken,
      supabase: null,
      serviceSupabase,
      localMode: true
    };
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    const fallbackUser = request.headers.get("x-user-id");
    if (!fallbackUser) {
      throw new Error("Unauthorized");
    }

    return {
      userId: fallbackUser,
      orgId: request.headers.get("x-org-id"),
      accessToken,
      supabase,
      serviceSupabase,
      localMode: false
    };
  }

  return {
    userId: data.user.id,
    orgId: request.headers.get("x-org-id"),
    accessToken,
    supabase,
    serviceSupabase,
    localMode: false
  };
}
