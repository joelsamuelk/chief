import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { createTask, getTasks, type TaskFilter } from "@/lib/services/tasks";

const allowedFilters: TaskFilter[] = [
  "all",
  "today",
  "overdue",
  "upcoming",
  "waiting",
  "completed",
  "archived"
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterParam = (searchParams.get("filter") ?? "all") as TaskFilter;
    const filter = allowedFilters.includes(filterParam) ? filterParam : "all";
    const tasks = getTasks(filter);
    return jsonOk({ tasks, filter });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      title: string;
      description?: string | null;
      due_at?: string | null;
      priority?: "low" | "medium" | "high";
      status?: "open" | "completed" | "archived" | "waiting";
      source_id?: string | null;
      delegated_to?: string | null;
      waiting_on?: string | null;
      initiative_id?: string | null;
    }>(request);

    const task = createTask({
      title: payload.title,
      description: payload.description ?? null,
      due_at: payload.due_at ?? null,
      priority: payload.priority ?? "medium",
      status: payload.status ?? "open",
      source_id: payload.source_id ?? null,
      delegated_to: payload.delegated_to ?? null,
      waiting_on: payload.waiting_on ?? null,
      initiative_id: payload.initiative_id ?? null
    });

    return jsonOk({ task }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
