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
  const keyResults = repos.keyResult.list(context);
  const initiatives = repos.initiative.list(context);
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

  const activeTasks = tasks.filter((task) => task.status !== "completed" && task.status !== "archived");
  const unalignedActiveTasks = activeTasks.filter((task) => !task.initiative_id);
  const unalignedRatio = activeTasks.length > 0 ? unalignedActiveTasks.length / activeTasks.length : 0;

  const atRiskWithoutActiveInitiatives = keyResults.filter((kr) => {
    if (kr.status !== "at_risk") return false;
    const hasActiveInitiative = initiatives.some(
      (initiative) =>
        initiative.key_result_id === kr.id && (initiative.status === "active" || initiative.status === "planned")
    );
    return !hasActiveInitiative;
  });

  if (unalignedRatio > 0.6 || atRiskWithoutActiveInitiatives.length > 0) {
    const reasons: string[] = [];
    if (unalignedRatio > 0.6) {
      reasons.push(
        `${unalignedActiveTasks.length}/${activeTasks.length} active tasks are not linked to an initiative.`
      );
    }
    if (atRiskWithoutActiveInitiatives.length > 0) {
      reasons.push(`${atRiskWithoutActiveInitiatives.length} at-risk key result(s) have no active initiatives.`);
    }

    risks.push({
      kind: "execution_drift",
      title: "Execution drift detected",
      detail: reasons.join(" "),
      severity: "medium",
      confidence: 0.81,
      evidence: reasons.map((reason) => ({ quote: reason })),
      source_id: "execution-drift"
    });
  }

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
  const initiatives = repos.initiative.list(context);
  const keyResults = repos.keyResult.list(context);
  const initiativeById = new Map(initiatives.map((initiative) => [initiative.id, initiative]));
  const keyResultById = new Map(keyResults.map((kr) => [kr.id, kr]));
  const meetingsToday = getMeetings("all").filter((meeting) => {
    const meetingDay = toDayKey(meeting.start_time);
    return meetingDay === todayKey;
  });
  const queueCount = repos.extractedItem.listQueue(context, new Date().toISOString()).length;
  const risks = detectRisks();
  const snapshot = repos.snapshot.upsert(context, todayKey, topPriorities, risks);

  const prioritiesWithExecution = topPriorities.map((priority) => {
    const task = openTasks.find((item) => item.id === priority.task_id);
    const initiative = task?.initiative_id ? initiativeById.get(task.initiative_id) : null;
    const keyResult = initiative ? keyResultById.get(initiative.key_result_id) : null;

    return {
      ...priority,
      initiative_id: initiative?.id ?? null,
      initiative_title: initiative?.title ?? null,
      key_result_id: keyResult?.id ?? null,
      key_result_metric: keyResult?.metric_name ?? null
    };
  });

  return {
    date: todayKey,
    top_priorities: prioritiesWithExecution,
    overdue,
    meetings_today: meetingsToday,
    risks,
    queue_count: queueCount,
    snapshot
  };
}
