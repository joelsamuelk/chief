import type { ServerAuthContext } from "@chief/data/server";
import { getServerAuthContext } from "@chief/data/server";
import { NextResponse } from "next/server";
import { ApiError } from "./errors";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: init?.status ?? 200, headers: init?.headers });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null
        }
      },
      { status: error.status }
    );
  }

  const fromObject =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown })
      : null;
  const message =
    error instanceof Error
      ? error.message
      : typeof fromObject?.message === "string" && fromObject.message.trim().length > 0
        ? fromObject.message
        : "Unexpected server error";
  const code =
    typeof fromObject?.code === "string" && fromObject.code.trim().length > 0
      ? fromObject.code
      : "internal_error";
  const details =
    fromObject && (fromObject.details !== undefined || fromObject.hint !== undefined)
      ? {
          details: fromObject.details ?? null,
          hint: fromObject.hint ?? null
        }
      : null;

  return NextResponse.json(
    {
      error: {
        code,
        message,
        details
      }
    },
    { status: 500 }
  );
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export async function parseOptionalJson<T>(request: Request, fallback: T): Promise<T> {
  const raw = await request.text();
  if (!raw.trim()) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export function requireSupabase(context: ServerAuthContext) {
  if (!context.supabase) {
    throw new ApiError(
      503,
      "supabase_unavailable",
      "Supabase environment variables are required for this endpoint."
    );
  }

  return context.supabase;
}

export async function withAuthedRoute(
  request: Request,
  handler: (context: ServerAuthContext) => Promise<Response>
): Promise<Response> {
  try {
    const context = await getServerAuthContext(request);
    return await handler(context);
  } catch (error) {
    return jsonError(error);
  }
}
