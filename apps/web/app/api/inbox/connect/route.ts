import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { connectProvider, disconnectProvider } from "@/lib/services/inbox";
import { requireAuth } from "@/lib/utils/auth";
import {
  inboxConnectSchema,
  parseWithSchema,
  type InboxConnectPayload
} from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const context = await requireAuth(request);
    const payload = parseWithSchema<InboxConnectPayload>(
      inboxConnectSchema as {
        safeParse: (value: unknown) => {
          success: boolean;
          data: InboxConnectPayload;
          error?: { flatten: () => unknown };
        };
      },
      await parseJson<unknown>(request)
    );

    if (payload.action === "connect") {
      const connection = await connectProvider(context, payload.provider, payload.provider_user_id);
      return jsonOk({ connection });
    }

    await disconnectProvider(context, payload.provider, payload.connection_id);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
