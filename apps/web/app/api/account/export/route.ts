import { exportAccountData } from "@/lib/services/account-service";
import { jsonOk, withAuthedRoute } from "@/lib/server/http";

export async function GET(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const data = await exportAccountData(context);
    return jsonOk(data);
  });
}
