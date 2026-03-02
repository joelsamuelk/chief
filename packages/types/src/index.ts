export type Category = "work" | "personal" | "health" | "finance";
export type Priority = "low" | "med" | "medium" | "high";
export type TaskStatus = "open" | "done" | "completed" | "archived" | "waiting";

export interface Profile {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  org_id?: string | null;
  title: string;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  due_at?: string | null;
  all_day?: boolean | null;
  category?: Category | null;
  priority: Priority;
  status: TaskStatus;
  source_id?: string | null;
  delegated_to?: string | null;
  delegated_by?: string | null;
  delegated_acknowledged_at?: string | null;
  initiative_id?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  user_id: string;
  org_id?: string | null;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  notes: string | null;
  category: Category;
  created_at: string;
}

export type DecisionStatus = "proposed" | "approved" | "implemented";

export interface Decision {
  id: string;
  user_id: string;
  org_id?: string | null;
  title: string;
  context: string | null;
  outcome: string | null;
  owner?: string | null;
  status?: DecisionStatus;
  related_meeting_id?: string | null;
  outcome_id?: string | null;
  initiative_id?: string | null;
  source_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface WeeklyFocus {
  id: string;
  user_id: string;
  week_start: string;
  focus: string;
  created_at: string;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  due_at?: string | null;
  all_day?: boolean;
  category?: Category;
  priority?: Priority;
  status?: TaskStatus;
  source_id?: string | null;
  delegated_to?: string | null;
  delegated_by?: string | null;
  initiative_id?: string | null;
}

export interface EventInput {
  title: string;
  start_at: string;
  end_at: string;
  location?: string | null;
  notes?: string | null;
  category: Category;
}

export type ProactivityLevel = "reactive" | "quiet" | "strong";

export interface ChiefProfile {
  user_id: string;
  org_id: string | null;
  role: string | null;
  team_size: number | null;
  timezone: string;
  work_start: string | null;
  work_end: string | null;
  work_days: string[];
  proactivity_level: ProactivityLevel;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type SourceKind = "email" | "meeting" | "shared_text" | "manual";

export interface Source {
  id: string;
  user_id: string;
  org_id: string | null;
  kind: SourceKind;
  provider: string;
  external_id: string | null;
  raw_content: string;
  created_at: string;
  processed_at: string | null;
}

export type ExtractedItemKind = "task" | "decision" | "follow_up" | "risk" | "summary";
export type ExtractedItemStatus = "pending" | "accepted" | "dismissed" | "snoozed";
export type AcceptedEntityType = "task" | "decision";

export interface EvidenceRef {
  label: string;
  quote?: string;
  source_id?: string;
  span?: { start: number; end: number };
}

export interface ExtractedItem {
  id: string;
  user_id: string;
  org_id: string | null;
  source_id: string;
  kind: ExtractedItemKind;
  status: ExtractedItemStatus;
  title: string;
  body: string | null;
  due_at: string | null;
  priority: "low" | "medium" | "high";
  confidence: number;
  evidence: EvidenceRef[];
  model: Record<string, unknown>;
  snoozed_until: string | null;
  snooze_count: number;
  accepted_entity_type: AcceptedEntityType | null;
  accepted_entity_id: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  attendees: Array<Record<string, unknown>>;
  notes: string | null;
  source_id: string | null;
  created_at: string;
}

export interface DecisionTaskLink {
  decision_id: string;
  task_id: string;
  created_at: string;
}

export interface AiRun {
  id: string;
  user_id: string;
  org_id: string | null;
  source_id: string | null;
  provider: string;
  model: string;
  status: string;
  latency_ms: number | null;
  created_at: string;
}

export interface TodaySnapshot {
  id: string;
  user_id: string;
  org_id: string | null;
  date: string;
  top_priorities: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: "admin" | "executive" | "member";
  created_at: string;
}

export interface ExtractionItemPayload {
  title: string;
  body?: string;
  due_at?: string | null;
  priority?: "low" | "medium" | "high";
  confidence: number;
  evidence: EvidenceRef[];
}

export interface ExtractionDecisionPayload {
  title: string;
  context?: string;
  owner?: string;
  confidence: number;
  evidence: EvidenceRef[];
}

export interface ExtractionOutput {
  summary: {
    text: string;
    confidence: number;
    evidence: EvidenceRef[];
  };
  tasks: ExtractionItemPayload[];
  decisions: ExtractionDecisionPayload[];
  follow_ups: ExtractionItemPayload[];
  risks: ExtractionItemPayload[];
  model: {
    provider: string;
    name: string;
    latency_ms: number;
    deterministic_only: boolean;
  };
}

export type RiskKind = "overdue" | "snoozed" | "delegation_stuck";

export interface RiskRecord {
  kind: RiskKind;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  confidence: number;
  evidence: EvidenceRef[];
  source_table: "tasks" | "extracted_items";
  source_id: string;
}

export interface TodayPriority {
  task_id: string;
  title: string;
  due_at: string | null;
  priority: Priority;
  delegated_to: string | null;
  score: number;
}

export interface TodayResponse {
  date: string;
  top_priorities: TodayPriority[];
  overdue: Task[];
  meetings_today: Meeting[];
  risks: RiskRecord[];
  queue_count: number;
}

export type AssistCommand =
  | "what_am_i_waiting_on"
  | "what_is_at_risk"
  | "summarize_today"
  | "prepare_me_for_meeting"
  | "show_pending_decisions";

export interface AssistRequest {
  prompt: string;
  meeting_time?: string;
}

export interface AssistEvidence {
  table: string;
  id: string;
  title?: string;
  reason: string;
}

export interface AssistResponse {
  command: AssistCommand;
  answer: string;
  confidence: number;
  evidence: AssistEvidence[];
}

export interface NotificationPlan {
  proactivity_level: ProactivityLevel;
  channels: Array<"in_app" | "brief" | "risk_alert" | "delegation_alert" | "overdue_alert">;
}
