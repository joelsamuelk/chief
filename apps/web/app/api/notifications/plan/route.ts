import { getNotificationPlan } from "@/lib/services/notification-service";
import { jsonOk, withAuthedRoute } from "@/lib/server/http";

export async function GET(request: Request) {
  return withAuthedRoute(request, async (context) => {
    const plan = await getNotificationPlan(context);
    return jsonOk({ plan });
  });
}
