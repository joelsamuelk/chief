import { getAccessTokenFromRequest, getServerAuthContext } from "@chief/data/server";
import type { ServerAuthContext } from "@chief/data/server";
import { ApiError } from "../server/errors";

export interface AuthContext {
  userId: string;
  orgId: string | null;
  supabase: NonNullable<ServerAuthContext["supabase"]>;
}

export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    throw new ApiError(401, "unauthorized", "Authorization bearer token is required.");
  }

  const context = await getServerAuthContext(request);
  if (context.localMode || !context.supabase || !context.userId) {
    throw new ApiError(401, "unauthorized", "Invalid or expired access token.");
  }

  return {
    userId: context.userId,
    orgId: context.orgId ?? null,
    supabase: context.supabase
  };
}
