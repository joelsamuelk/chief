import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { connectProvider, disconnectProvider } from "@/lib/services/inbox";

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      provider: "google" | "microsoft" | "apple";
      action: "connect" | "disconnect";
      provider_user_id?: string;
      connection_id?: string;
    }>(request);

    if (payload.action === "connect") {
      const connection = connectProvider(payload.provider, payload.provider_user_id);
      return jsonOk({ connection });
    }

    disconnectProvider(payload.provider, payload.connection_id);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
