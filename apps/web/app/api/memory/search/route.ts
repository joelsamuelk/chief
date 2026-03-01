import { jsonError, jsonOk } from "@/lib/server/http";
import { searchMemory } from "@/lib/services/memory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const results = searchMemory(q);
    const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
      const current = acc[item.type] ?? [];
      current.push(item);
      acc[item.type] = current;
      return acc;
    }, {});
    return jsonOk({ results, grouped });
  } catch (error) {
    return jsonError(error);
  }
}
