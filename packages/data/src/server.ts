export interface ServerAuthContext {
  userId: string;
  orgId: string | null;
  accessToken: string | null;
  supabase: any;
  serviceSupabase: any;
  localMode: boolean;
}

export function getAccessTokenFromRequest(_request: Request) {
  return null;
}

export function createServiceRoleClient() {
  return null;
}

export async function getServerAuthContext(request: Request): Promise<ServerAuthContext> {
  return {
    userId: request.headers.get("x-user-id") ?? "local-user",
    orgId: request.headers.get("x-org-id"),
    accessToken: null,
    supabase: null,
    serviceSupabase: null,
    localMode: true
  };
}
