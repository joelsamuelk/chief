import { deleteAccountData } from "@/lib/services/account-service";
import { jsonOk, parseOptionalJson, withAuthedRoute } from "@/lib/server/http";

export async function DELETE(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const payload = await parseOptionalJson<{ delete_auth_user?: boolean }>(request, {});
    const result = await deleteAccountData(context, payload);
    return jsonOk(result);
  });
}
