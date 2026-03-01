import { getDefaultContext, getRepos } from "../storage";

export interface MemoryResult {
  type: "summary" | "task" | "meeting" | "decision";
  id: string;
  title: string;
  excerpt: string;
  href: string;
}

export function searchMemory(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [] as MemoryResult[];

  const repos = getRepos();
  const context = getDefaultContext();
  const results: MemoryResult[] = [];

  repos.extractedItem
    .list(context)
    .filter((item) => item.kind === "summary")
    .forEach((item) => {
      const target = `${item.title} ${item.body ?? ""}`.toLowerCase();
      if (!target.includes(q)) return;
      results.push({
        type: "summary",
        id: item.id,
        title: item.title,
        excerpt: (item.body ?? item.title).slice(0, 180),
        href: "/queue"
      });
    });

  repos.task.list(context).forEach((task) => {
    const target = `${task.title} ${task.description ?? ""}`.toLowerCase();
    if (!target.includes(q)) return;
    results.push({
      type: "task",
      id: task.id,
      title: task.title,
      excerpt: (task.description ?? task.title).slice(0, 180),
      href: "/tasks"
    });
  });

  repos.meeting.list(context).forEach((meeting) => {
    const target = `${meeting.title} ${meeting.notes ?? ""}`.toLowerCase();
    if (!target.includes(q)) return;
    results.push({
      type: "meeting",
      id: meeting.id,
      title: meeting.title,
      excerpt: (meeting.notes ?? meeting.title).slice(0, 180),
      href: "/meetings"
    });
  });

  repos.decision.list(context).forEach((decision) => {
    const target = `${decision.title} ${decision.context ?? ""}`.toLowerCase();
    if (!target.includes(q)) return;
    results.push({
      type: "decision",
      id: decision.id,
      title: decision.title,
      excerpt: (decision.context ?? decision.title).slice(0, 180),
      href: "/decisions"
    });
  });

  return results;
}
