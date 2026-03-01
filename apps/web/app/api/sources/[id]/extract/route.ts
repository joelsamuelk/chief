import { jsonError, jsonOk } from "@/lib/server/http";
import { processSource } from "@/lib/services/sources";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = processSource(params.id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
