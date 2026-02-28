import type { AuthContext } from "@/lib/utils/auth";

export interface MemoryHit {
  type: "task" | "decision" | "meeting" | "queue_item" | "source";
  id: string;
  title: string;
  snippet: string;
}

export async function searchMemory(context: AuthContext, query: string, limit = 20): Promise<MemoryHit[]> {
  const term = `%${query.trim()}%`;
  if (!query.trim()) return [];

  const [tasksRes, decisionsRes, meetingsRes, queueRes, sourcesRes] = await Promise.all([
    context.supabase
      .from("tasks")
      .select("id,title,description")
      .or(`title.ilike.${term},description.ilike.${term}`)
      .limit(limit),
    context.supabase
      .from("decisions")
      .select("id,title,context")
      .or(`title.ilike.${term},context.ilike.${term}`)
      .limit(limit),
    context.supabase
      .from("meetings")
      .select("id,title,notes")
      .or(`title.ilike.${term},notes.ilike.${term}`)
      .limit(limit),
    context.supabase
      .from("extracted_items")
      .select("id,title,body")
      .or(`title.ilike.${term},body.ilike.${term}`)
      .limit(limit),
    context.supabase
      .from("sources")
      .select("id,provider,raw_content")
      .ilike("raw_content", term)
      .limit(Math.min(limit, 10))
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (decisionsRes.error) throw decisionsRes.error;
  if (meetingsRes.error) throw meetingsRes.error;
  if (queueRes.error) throw queueRes.error;
  if (sourcesRes.error) throw sourcesRes.error;

  const taskRows = (tasksRes.data ?? []) as Array<{ id: string; title: string | null; description: string | null }>;
  const decisionRows = (decisionsRes.data ?? []) as Array<{ id: string; title: string | null; context: string | null }>;
  const meetingRows = (meetingsRes.data ?? []) as Array<{ id: string; title: string | null; notes: string | null }>;
  const queueRows = (queueRes.data ?? []) as Array<{ id: string; title: string | null; body: string | null }>;
  const sourceRows = (sourcesRes.data ?? []) as Array<{ id: string; provider: string | null; raw_content: string | null }>;

  const hits: MemoryHit[] = [
    ...taskRows.map((item) => ({
      type: "task" as const,
      id: item.id,
      title: item.title ?? "Untitled task",
      snippet: (item.description ?? "").slice(0, 220)
    })),
    ...decisionRows.map((item) => ({
      type: "decision" as const,
      id: item.id,
      title: item.title ?? "Untitled decision",
      snippet: (item.context ?? "").slice(0, 220)
    })),
    ...meetingRows.map((item) => ({
      type: "meeting" as const,
      id: item.id,
      title: item.title ?? "Untitled meeting",
      snippet: (item.notes ?? "").slice(0, 220)
    })),
    ...queueRows.map((item) => ({
      type: "queue_item" as const,
      id: item.id,
      title: item.title ?? "Untitled queue item",
      snippet: (item.body ?? "").slice(0, 220)
    })),
    ...sourceRows.map((item) => ({
      type: "source" as const,
      id: item.id,
      title: `Source (${item.provider ?? "unknown"})`,
      snippet: (item.raw_content ?? "").slice(0, 220)
    }))
  ];

  return hits.slice(0, limit);
}
