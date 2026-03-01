import { exportAccountData } from "@/lib/services/account-service";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET() {
  try {
    const data = exportAccountData();
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
