import type {
  CreateDecisionInput,
  CreateExtractedItemInput,
  CreateMeetingInput,
  CreateSourceInput,
  CreateTaskInput,
  MemberRole
} from "./types";

export interface SeedPayload {
  organizationName: string;
  members: Array<{ name: string; role: MemberRole }>;
  profile: {
    role: string;
    team_size: number;
    timezone: string;
    work_start: string;
    work_end: string;
    work_days: string[];
    proactivity_level: "quiet";
    onboarding_completed: boolean;
  };
  sources: Array<CreateSourceInput & { forced_id: string }>;
  meetings: Array<CreateMeetingInput & { forced_id: string }>;
  tasks: Array<CreateTaskInput & { forced_id: string }>;
  decisions: Array<CreateDecisionInput & { forced_id: string }>;
  extractedItems: Array<CreateExtractedItemInput & { forced_id: string }>;
}

function dateOffset(days: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function buildSeedPayload(): SeedPayload {
  const sources: Array<CreateSourceInput & { forced_id: string }> = [
    {
      forced_id: "src-email-001",
      kind: "email",
      provider: "gmail",
      external_id: "email-001",
      raw_content:
        "Please review the Q2 board draft by Friday. We decided to move customer launch to next Tuesday."
    },
    {
      forced_id: "src-email-002",
      kind: "email",
      provider: "gmail",
      external_id: "email-002",
      raw_content:
        "Can you send final hiring plan tomorrow. Follow up with finance and approve budget changes."
    },
    {
      forced_id: "src-email-003",
      kind: "email",
      provider: "gmail",
      external_id: "email-003",
      raw_content:
        "Need to review legal terms by next week. Decision: retain current renewal clause."
    },
    {
      forced_id: "src-email-004",
      kind: "email",
      provider: "gmail",
      external_id: "email-004",
      raw_content:
        "Please approve the roadmap update today and circle back with product leads tomorrow."
    },
    {
      forced_id: "src-email-005",
      kind: "email",
      provider: "gmail",
      external_id: "email-005",
      raw_content:
        "Agreed to pause enterprise pilot in Germany. Follow up with sales before Monday."
    },
    {
      forced_id: "src-email-006",
      kind: "email",
      provider: "gmail",
      external_id: "email-006",
      raw_content:
        "Can you review incident report by Thursday. We will publish customer note by Friday."
    },
    {
      forced_id: "src-email-007",
      kind: "email",
      provider: "gmail",
      external_id: "email-007",
      raw_content:
        "Need to send revised forecast next week and check in with operations lead."
    },
    {
      forced_id: "src-email-008",
      kind: "email",
      provider: "gmail",
      external_id: "email-008",
      raw_content:
        "Please review partnership draft by Wednesday. Decision pending legal approval."
    },
    {
      forced_id: "src-email-009",
      kind: "email",
      provider: "gmail",
      external_id: "email-009",
      raw_content:
        "We decided to onboard two new pilot customers. Follow up with support this afternoon."
    },
    {
      forced_id: "src-email-010",
      kind: "email",
      provider: "gmail",
      external_id: "email-010",
      raw_content:
        "Can you send revised KPI pack today. Need to approve final narrative by tomorrow."
    }
  ];

  const meetings: Array<CreateMeetingInput & { forced_id: string }> = [
    {
      forced_id: "mtg-001",
      title: "Leadership Weekly",
      start_time: dateOffset(0, 10, 0),
      end_time: dateOffset(0, 10, 45),
      attendees: [{ name: "Joel" }, { name: "Amina" }, { name: "Priya" }],
      notes:
        "We decided to prioritize onboarding completion metrics. Please send dashboard updates by Friday."
    },
    {
      forced_id: "mtg-002",
      title: "Product and Ops Sync",
      start_time: dateOffset(0, 15, 0),
      end_time: dateOffset(0, 15, 30),
      attendees: [{ name: "Joel" }, { name: "Nina" }, { name: "Marcus" }],
      notes:
        "Need to review release blockers tomorrow. Follow up with infrastructure team by next week."
    },
    {
      forced_id: "mtg-003",
      title: "Finance Planning",
      start_time: dateOffset(1, 11, 0),
      end_time: dateOffset(1, 11, 45),
      attendees: [{ name: "Joel" }, { name: "Hugo" }],
      notes: "Agreed budget freeze until Monday. Can you review vendor renewals by Thursday."
    },
    {
      forced_id: "mtg-004",
      title: "Customer Risk Review",
      start_time: dateOffset(2, 14, 0),
      end_time: dateOffset(2, 14, 45),
      attendees: [{ name: "Joel" }, { name: "Lina" }, { name: "Sam" }],
      notes: "Decision: escalate two accounts. Need to send recovery plan tomorrow."
    },
    {
      forced_id: "mtg-005",
      title: "Board Prep",
      start_time: dateOffset(3, 9, 0),
      end_time: dateOffset(3, 9, 45),
      attendees: [{ name: "Joel" }, { name: "Amina" }],
      notes: "Please review board packet by Friday. We will finalize talking points next week."
    },
    {
      forced_id: "mtg-006",
      title: "Hiring Committee",
      start_time: dateOffset(-1, 16, 0),
      end_time: dateOffset(-1, 17, 0),
      attendees: [{ name: "Joel" }, { name: "Ravi" }, { name: "Tess" }],
      notes: "Agreed to hire one engineer. Follow up with recruiting by tomorrow."
    }
  ];

  const tasks: Array<CreateTaskInput & { forced_id: string }> = [
    {
      forced_id: "task-001",
      title: "Review Q2 board draft",
      description: "Prepare final draft and narrative alignment",
      due_at: dateOffset(0, 17, 0),
      priority: "high",
      status: "open"
    },
    {
      forced_id: "task-002",
      title: "Send hiring plan",
      due_at: dateOffset(1, 10, 0),
      priority: "medium",
      status: "waiting",
      delegated_to: "member-004",
      delegated_by: "local-user"
    },
    {
      forced_id: "task-003",
      title: "Approve roadmap update",
      due_at: dateOffset(0, 13, 0),
      priority: "high",
      status: "open"
    },
    {
      forced_id: "task-004",
      title: "Review legal terms",
      due_at: dateOffset(4, 12, 0),
      priority: "medium",
      status: "open"
    },
    {
      forced_id: "task-005",
      title: "Send revised forecast",
      due_at: dateOffset(5, 11, 0),
      priority: "medium",
      status: "open",
      waiting_on: "Finance assumptions"
    },
    {
      forced_id: "task-006",
      title: "Customer recovery plan",
      due_at: dateOffset(-4, 18, 0),
      priority: "high",
      status: "open"
    },
    {
      forced_id: "task-007",
      title: "Review incident report",
      due_at: dateOffset(-1, 14, 0),
      priority: "high",
      status: "completed"
    },
    {
      forced_id: "task-008",
      title: "Finalize talking points",
      due_at: dateOffset(7, 9, 0),
      priority: "low",
      status: "open"
    },
    {
      forced_id: "task-009",
      title: "Update KPI pack",
      due_at: dateOffset(0, 11, 30),
      priority: "high",
      status: "open"
    },
    {
      forced_id: "task-010",
      title: "Recruiting follow-up",
      due_at: dateOffset(-2, 12, 0),
      priority: "medium",
      status: "waiting",
      delegated_to: "member-002",
      delegated_by: "local-user"
    },
    {
      forced_id: "task-011",
      title: "Vendor renewals review",
      due_at: dateOffset(2, 16, 0),
      priority: "medium",
      status: "archived"
    },
    {
      forced_id: "task-012",
      title: "Pilot customer onboarding",
      due_at: dateOffset(3, 15, 0),
      priority: "medium",
      status: "open"
    }
  ];

  const decisions: Array<CreateDecisionInput & { forced_id: string }> = [
    {
      forced_id: "decision-001",
      title: "Move customer launch date",
      context: "Sequencing requires support readiness",
      owner: "Joel",
      status: "approved",
      related_meeting_id: "mtg-001"
    },
    {
      forced_id: "decision-002",
      title: "Pause Germany enterprise pilot",
      context: "Legal and support constraints",
      owner: "Amina",
      status: "implemented"
    },
    {
      forced_id: "decision-003",
      title: "Budget freeze through Monday",
      context: "Cashflow stabilization",
      owner: "Hugo",
      status: "approved",
      related_meeting_id: "mtg-003"
    },
    {
      forced_id: "decision-004",
      title: "Escalate two at-risk accounts",
      context: "Renewal probability dropped",
      owner: "Lina",
      status: "proposed",
      related_meeting_id: "mtg-004"
    },
    {
      forced_id: "decision-005",
      title: "Hire one engineer this cycle",
      context: "Critical backend bandwidth",
      owner: "Ravi",
      status: "approved",
      related_meeting_id: "mtg-006"
    }
  ];

  const extractedItems: Array<CreateExtractedItemInput & { forced_id: string }> = Array.from(
    { length: 20 },
    (_, index) => {
      const n = index + 1;
      const source = sources[index % sources.length];
      const kind: CreateExtractedItemInput["kind"] =
        n % 5 === 0 ? "decision" : n % 4 === 0 ? "follow_up" : n % 3 === 0 ? "risk" : "task";
      return {
        forced_id: `extract-${String(n).padStart(3, "0")}`,
        source_id: source.forced_id,
        kind,
        status: n <= 8 ? "pending" : n <= 12 ? "accepted" : n <= 16 ? "snoozed" : "dismissed",
        title:
          kind === "decision"
            ? `Decision candidate ${n}`
            : kind === "risk"
              ? `Risk signal ${n}`
              : `Action candidate ${n}`,
        body: `Generated from ${source.provider} source ${source.external_id ?? "manual"}.`,
        due_at: n % 2 === 0 ? dateOffset((n % 5) - 2, 17, 0) : null,
        priority: n % 4 === 0 ? "high" : "medium",
        confidence: 0.56 + (n % 5) * 0.08,
        evidence: [{ quote: source.raw_content.slice(0, 90) }],
        model: { provider: "heuristic", name: "local-rule-engine-v1" },
        snoozed_until: n > 12 && n <= 16 ? dateOffset(1, 9, 0) : null
      };
    }
  );

  return {
    organizationName: "Chief Demo Org",
    members: [
      { name: "Joel Samuel", role: "executive" },
      { name: "Amina Clarke", role: "admin" },
      { name: "Priya Singh", role: "member" },
      { name: "Marcus Hale", role: "member" },
      { name: "Nina Alvarez", role: "member" },
      { name: "Hugo Martin", role: "member" }
    ],
    profile: {
      role: "Founder",
      team_size: 18,
      timezone: "Europe/London",
      work_start: "08:30",
      work_end: "18:00",
      work_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      proactivity_level: "quiet",
      onboarding_completed: true
    },
    sources,
    meetings,
    tasks,
    decisions,
    extractedItems
  };
}
