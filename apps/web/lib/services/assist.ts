import { getRepos } from "../storage";
import { getMeeting, getMeetings } from "./meetings";
import { getDecisions } from "./decisions";
import { executionAssistSummary, generateWeeklyExecutionBrief } from "./execution";
import { generateEodRecap, generateMorningBrief } from "./notifications";
import { getTeamOverview } from "./team";
import { getTasks } from "./tasks";
import { getTodaySnapshot } from "./today";

type AssistIntent =
  | "waiting_on"
  | "at_risk"
  | "summarize_today"
  | "prepare_meeting"
  | "pending_decisions"
  | "execution_quarter"
  | "execution_at_risk"
  | "execution_unaligned"
  | "execution_health"
  | "execution_weekly"
  | "digest"
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
  if (q.includes("weekly execution brief") || (q.includes("execution") && q.includes("weekly") && q.includes("brief"))) {
    return "execution_weekly";
  }
  if (q.includes("digest") || q.includes("brief") || q.includes("recap")) return "digest";
  if (q.includes("tracking this quarter") || q.includes("this quarter")) return "execution_quarter";
  if (q.includes("krs") && q.includes("risk")) return "execution_at_risk";
  if (q.includes("not aligned") || q.includes("unaligned")) return "execution_unaligned";
  if (q.includes("execution health")) return "execution_health";
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

  if (section === "execution" || path.includes("/execution")) {
    return "You are on Execution. Try: \"How are we tracking this quarter?\"";
  }

  return "Try one of these: What am I waiting on? What is at risk? Summarize today. Prepare me for my next meeting.";
}

export function handleAssistQuery(query: string, meetingId?: string, appContext?: AssistAppContext) {
  const intent = detectIntent(query);
  const repos = getRepos();
  const references: AssistReference[] = [];

  if (intent === "digest") {
    const lower = query.toLowerCase();
    const wantsEod = /eod|end of day|recap/.test(lower);

    if (wantsEod) {
      const { digest, content } = generateEodRecap();
      const completedCount = typeof content.completed_count === "number" ? content.completed_count : 0;
      const outstandingCount = typeof content.outstanding_count === "number" ? content.outstanding_count : 0;

      references.push({ type: "digest", id: digest.id, title: "EOD recap" });
      return {
        intent,
        answer: `EOD digest created. Completed: ${completedCount}. Outstanding: ${outstandingCount}. You can view it on Today and Settings.`,
        references
      };
    }

    const { digest, content } = generateMorningBrief();
    const priorities = Array.isArray(content.priorities) ? content.priorities.length : 0;
    const risks = Array.isArray(content.risks) ? content.risks.length : 0;
    const queueCount = typeof content.queue_count === "number" ? content.queue_count : 0;

    references.push({ type: "digest", id: digest.id, title: "Morning brief" });
    return {
      intent,
      answer: `Morning digest created. Priorities: ${priorities}, risks: ${risks}, queue: ${queueCount}. You can view it on Today and Settings.`,
      references
    };
  }

  if (intent === "execution_weekly") {
    const brief = generateWeeklyExecutionBrief();
    brief.outcomes_summary.slice(0, 6).forEach((outcome) => {
      references.push({ type: "outcome", id: outcome.outcome_id, title: outcome.title });
    });

    return {
      intent,
      answer: `Weekly execution brief: ${brief.outcomes_summary.length} active outcome(s), ${brief.krs_at_risk.length} KR(s) at risk, ${brief.completed_initiatives.length} completed initiative(s), ${brief.major_blockers.length} blocker(s).`,
      references
    };
  }

  if (intent === "execution_quarter") {
    const summary = executionAssistSummary();
    summary.at_risk.slice(0, 8).forEach((kr) => {
      references.push({ type: "key_result", id: kr.id, title: kr.metric_name });
    });

    return {
      intent,
      answer: `Quarter ${summary.quarter}: ${summary.outcome_count} outcome(s), ${summary.key_result_count} KR(s), ${summary.at_risk.length} KR(s) at risk/off-track.`,
      references
    };
  }

  if (intent === "execution_at_risk") {
    const summary = executionAssistSummary();
    if (summary.at_risk.length === 0) {
      return { intent, answer: "No KRs are currently marked at risk.", references: [] };
    }

    summary.at_risk.slice(0, 8).forEach((kr) => {
      references.push({ type: "key_result", id: kr.id, title: kr.metric_name });
    });

    return {
      intent,
      answer: `KRs at risk: ${summary.at_risk.map((kr) => `${kr.metric_name} (${kr.id})`).join(", ")}`,
      references
    };
  }

  if (intent === "execution_unaligned") {
    const summary = executionAssistSummary();
    const ratioPercent = Math.round(summary.alignment.unaligned_ratio * 100);
    return {
      intent,
      answer: `${summary.alignment.unaligned_task_count} active task(s) are not linked to an initiative (${ratioPercent}%).`,
      references: []
    };
  }

  if (intent === "execution_health") {
    const summary = executionAssistSummary();
    const ratioPercent = Math.round(summary.alignment.unaligned_ratio * 100);
    return {
      intent,
      answer: `Execution health: ${summary.outcome_count} outcome(s), ${summary.key_result_count} KR(s), ${summary.at_risk.length} KR(s) at risk, ${ratioPercent}% unaligned active tasks.`,
      references: summary.at_risk.slice(0, 6).map((kr) => ({ type: "key_result", id: kr.id, title: kr.metric_name }))
    };
  }

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
