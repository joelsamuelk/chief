import { deleteAccountData, seedAccountData } from "@/lib/services/account-service";
import { jsonError, jsonOk, parseOptionalJson } from "@/lib/server/http";

export async function DELETE(request: Request) {
  try {
    const payload = await parseOptionalJson<{ action?: "reset" | "seed" }>(request, {});
    const result = payload.action === "seed" ? seedAccountData() : deleteAccountData();
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
