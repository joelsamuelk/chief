import { getDefaultContext, getRepos } from "../storage";
import type { Risk, Task, TodayPriority } from "../storage";
import { getMeetings } from "./meetings";
import { getTasks } from "./tasks";

function toDayKey(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scoreTask(task: Task, todayKey: string) {
  let score = 0;
  if (task.status === "completed" || task.status === "archived") return score;
  const dueKey = task.due_at ? toDayKey(task.due_at) : null;
  if (dueKey && dueKey < todayKey) score += 3;
  if (dueKey && dueKey === todayKey) score += 2;
  if (task.priority === "high") score += 1;
  if (task.waiting_on && task.waiting_on.trim().length > 0) score += 1;
  return score;
}

export function detectRisks() {
  const repos = getRepos();
  const context = getDefaultContext();
  const tasks = repos.task.list(context);
  const queue = repos.extractedItem.list(context);
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fortyEightHoursAgo = new Date(now);
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

  const risks: Risk[] = [];

  tasks.forEach((task) => {
    if (task.status === "open" && task.due_at) {
      const dueAt = new Date(task.due_at);
      if (dueAt.getTime() < threeDaysAgo.getTime()) {
        risks.push({
          kind: "overdue",
          title: `Task overdue: ${task.title}`,
          detail: "Task is overdue by more than three days.",
          severity: "high",
          confidence: 0.83,
          evidence: [{ quote: task.title }],
          source_id: task.id
        });
      }
    }

    if (
      task.delegated_to &&
      !task.delegated_acknowledged_at &&
      new Date(task.created_at).getTime() < fortyEightHoursAgo.getTime()
    ) {
      risks.push({
        kind: "delegated_stuck",
        title: `Delegation waiting: ${task.title}`,
        detail: "Delegated task has not been acknowledged in 48h.",
        severity: "medium",
        confidence: 0.74,
        evidence: [{ quote: task.title }],
        source_id: task.id
      });
    }
  });

  queue.forEach((item) => {
    if (item.status === "snoozed" && item.snooze_count > 2) {
      risks.push({
        kind: "snoozed",
        title: `Repeated snooze: ${item.title}`,
        detail: "Queue item has been snoozed more than two times.",
        severity: "medium",
        confidence: 0.69,
        evidence: item.evidence,
        source_id: item.id
      });
    }
  });

  return risks;
}

export function getTodaySnapshot() {
  const repos = getRepos();
  const context = getDefaultContext();
  const todayDate = new Date();
  const todayKey = toDayKey(todayDate)!;

  const openTasks = getTasks("all").filter((task) => task.status !== "completed" && task.status !== "archived");
  const scored = openTasks
    .map((task) => ({
      task,
      score: scoreTask(task, todayKey)
    }))
    .sort((a, b) => b.score - a.score);

  const topPriorities: TodayPriority[] = scored.slice(0, 3).map((item) => ({
    task_id: item.task.id,
    title: item.task.title,
    due_at: item.task.due_at,
    priority: item.task.priority,
    score: item.score
  }));

  const overdue = getTasks("overdue");
  const meetingsToday = getMeetings("all").filter((meeting) => {
    const meetingDay = toDayKey(meeting.start_time);
    return meetingDay === todayKey;
  });
  const queueCount = repos.extractedItem.listQueue(context, new Date().toISOString()).length;
  const risks = detectRisks();
  const snapshot = repos.snapshot.upsert(context, todayKey, topPriorities, risks);

  return {
    date: todayKey,
    top_priorities: topPriorities,
    overdue,
    meetings_today: meetingsToday,
    risks,
    queue_count: queueCount,
    snapshot
  };
}
