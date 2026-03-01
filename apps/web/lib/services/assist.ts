import { getRepos } from "../storage";
import { getMeeting, getMeetings } from "./meetings";
import { getDecisions } from "./decisions";
import { getTeamOverview } from "./team";
import { getTasks } from "./tasks";
import { getTodaySnapshot } from "./today";

type AssistIntent =
  | "waiting_on"
  | "at_risk"
  | "summarize_today"
  | "prepare_meeting"
  | "pending_decisions"
  | "unknown";

interface AssistReference {
  type: string;
  id: string;
  title: string;
}

interface AssistAppContext {
  path?: string;
  section?: string;
}

function detectIntent(query: string): AssistIntent {
  const q = query.toLowerCase();
  if (q.includes("waiting") || q.includes("wait")) return "waiting_on";
  if (q.includes("risk")) return "at_risk";
  if (q.includes("summarize") || q.includes("summary") || q.includes("today")) return "summarize_today";
  if (q.includes("prepare") || q.includes("meeting")) return "prepare_meeting";
  if (q.includes("decision") || q.includes("approve") || q.includes("implement")) return "pending_decisions";
  return "unknown";
}

function contextHint(context?: AssistAppContext) {
  const section = context?.section?.toLowerCase();
  const path = context?.path?.toLowerCase() ?? "";

  if (section === "tasks" || path.includes("/tasks")) {
    return "You are on Tasks. Try: \"What am I waiting on?\" or \"What is at risk?\"";
  }

  if (section === "decisions" || path.includes("/decisions")) {
    return "You are on Decisions. Try: \"Show pending decisions.\"";
  }

  if (section === "meetings" || path.includes("/meetings")) {
    return "You are on Meetings. Try: \"Prepare me for my next meeting.\"";
  }

  if (section === "today" || path.includes("/today")) {
    return "You are on Today. Try: \"Summarize today.\"";
  }

  if (section === "queue" || path.includes("/queue")) {
    return "You are on Queue. Try: \"What is at risk?\" to prioritize incoming items.";
  }

  return "Try one of these: What am I waiting on? What is at risk? Summarize today. Prepare me for my next meeting.";
}

export function handleAssistQuery(query: string, meetingId?: string, appContext?: AssistAppContext) {
  const intent = detectIntent(query);
  const repos = getRepos();
  const references: AssistReference[] = [];

  if (intent === "waiting_on") {
    const team = getTeamOverview();
    const waiting = team.waiting_on_others;
    if (waiting.length === 0) {
      return { intent, answer: "Not enough information.", references: [] };
    }

    waiting.slice(0, 5).forEach((task) => {
      references.push({ type: "task", id: task.id, title: task.title });
    });

    return {
      intent,
      answer: `You are waiting on ${waiting.length} delegated task(s). Prioritise follow-up on the first two today.`,
      references
    };
  }

  if (intent === "at_risk") {
    const snapshot = getTodaySnapshot();
    if (snapshot.risks.length === 0) {
      return { intent, answer: "Not enough information.", references: [] };
    }
    snapshot.risks.slice(0, 5).forEach((risk) => {
      references.push({ type: "risk", id: risk.source_id, title: risk.title });
    });
    return {
      intent,
      answer: `There are ${snapshot.risks.length} risk signal(s). Start with overdue and delegated-stuck items.`,
      references
    };
  }

  if (intent === "summarize_today") {
    const snapshot = getTodaySnapshot();
    if (
      snapshot.top_priorities.length === 0 &&
      snapshot.overdue.length === 0 &&
      snapshot.meetings_today.length === 0
    ) {
      return { intent, answer: "Not enough information.", references: [] };
    }

    snapshot.top_priorities.forEach((priority) => {
      references.push({ type: "task", id: priority.task_id, title: priority.title });
    });

    return {
      intent,
      answer: `Today has ${snapshot.top_priorities.length} top priorities, ${snapshot.overdue.length} overdue task(s), ${snapshot.meetings_today.length} meeting(s), and ${snapshot.queue_count} queue item(s).`,
      references
    };
  }

  if (intent === "prepare_meeting") {
    const meeting = meetingId ? getMeeting(meetingId) : getMeetings("upcoming")[0] ?? null;
    if (!meeting) {
      return { intent, answer: "Not enough information.", references: [] };
    }

    references.push({ type: "meeting", id: meeting.id, title: meeting.title });
    const linkedTasks = getTasks("all").filter((task) => task.source_id === meeting.source_id);
    linkedTasks.slice(0, 4).forEach((task) => {
      references.push({ type: "task", id: task.id, title: task.title });
    });

    return {
      intent,
      answer: `Meeting prep: review notes, confirm owner decisions, and cover ${linkedTasks.length} linked task(s).`,
      references
    };
  }

  if (intent === "pending_decisions") {
    const pending = getDecisions().filter((decision) => decision.status === "proposed");
    if (pending.length === 0) {
      return { intent, answer: "Not enough information.", references: [] };
    }
    pending.slice(0, 6).forEach((decision) => {
      references.push({ type: "decision", id: decision.id, title: decision.title });
    });
    return {
      intent,
      answer: `There are ${pending.length} pending decision(s). Review ownership and next step for each.`,
      references
    };
  }

  const queuePending = repos.extractedItem
    .list({ userId: "local-user", orgId: null })
    .filter((item) => item.status === "pending").length;

  const hint = contextHint(appContext);
  return {
    intent: "unknown",
    answer:
      queuePending > 0
        ? `Not enough information. ${hint} There are ${queuePending} queue item(s) pending.`
        : `Not enough information. ${hint}`,
    references: []
  };
}
