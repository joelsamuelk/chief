export type ProactivityLevel = "reactive" | "quiet" | "strong";
export type Priority = "low" | "medium" | "high";
export type TaskStatus = "open" | "completed" | "archived" | "waiting";
export type DecisionStatus = "proposed" | "approved" | "implemented";
export type SourceKind = "email" | "meeting" | "shared_text" | "manual_note";
export type ExtractedItemKind = "task" | "decision" | "follow_up" | "risk" | "summary";
export type ExtractedItemStatus = "pending" | "accepted" | "dismissed" | "snoozed";
export type MemberRole = "admin" | "executive" | "member";
export type DigestKind = "morning" | "eod";

export interface Profile {
  user_id: string;
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

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  org_id: string;
  name: string;
  role: MemberRole;
  created_at: string;
}

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

export interface EvidenceRef {
  quote: string;
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
  priority: Priority;
  confidence: number;
  evidence: EvidenceRef[];
  model: Record<string, unknown>;
  snoozed_until: string | null;
  snooze_count: number;
  accepted_entity_type: "task" | "decision" | null;
  accepted_entity_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: Priority;
  status: TaskStatus;
  source_id: string | null;
  delegated_to: string | null;
  delegated_by: string | null;
  delegated_acknowledged_at: string | null;
  waiting_on: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  attendees: Array<{ name: string; email?: string }>;
  notes: string | null;
  source_id: string | null;
  created_at: string;
}

export interface Decision {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  context: string | null;
  owner: string | null;
  status: DecisionStatus;
  related_meeting_id: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  kind: "overdue" | "snoozed" | "delegated_stuck";
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  evidence: EvidenceRef[];
  source_id: string;
}

export interface TodayPriority {
  task_id: string;
  title: string;
  due_at: string | null;
  priority: Priority;
  score: number;
}

export interface TodaySnapshot {
  id: string;
  user_id: string;
  org_id: string | null;
  date: string;
  top_priorities: TodayPriority[];
  risks: Risk[];
  created_at: string;
}

export interface DigestRecord {
  id: string;
  user_id: string;
  org_id: string | null;
  kind: DigestKind;
  content: Record<string, unknown>;
  created_at: string;
}

export interface StorageContext {
  userId: string;
  orgId: string | null;
}

export interface CreateSourceInput {
  org_id?: string | null;
  kind: SourceKind;
  provider: string;
  external_id?: string | null;
  raw_content: string;
}

export interface CreateExtractedItemInput {
  org_id?: string | null;
  source_id: string;
  kind: ExtractedItemKind;
  status?: ExtractedItemStatus;
  title: string;
  body?: string | null;
  due_at?: string | null;
  priority?: Priority;
  confidence: number;
  evidence: EvidenceRef[];
  model?: Record<string, unknown>;
  snoozed_until?: string | null;
}

export interface CreateTaskInput {
  org_id?: string | null;
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  source_id?: string | null;
  delegated_to?: string | null;
  delegated_by?: string | null;
  waiting_on?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  due_at?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  delegated_to?: string | null;
  delegated_by?: string | null;
  delegated_acknowledged_at?: string | null;
  waiting_on?: string | null;
  completed_at?: string | null;
}

export interface CreateMeetingInput {
  org_id?: string | null;
  title: string;
  start_time: string;
  end_time: string;
  attendees?: Array<{ name: string; email?: string }>;
  notes?: string | null;
  source_id?: string | null;
}

export interface UpdateMeetingInput {
  title?: string;
  start_time?: string;
  end_time?: string;
  attendees?: Array<{ name: string; email?: string }>;
  notes?: string | null;
  source_id?: string | null;
}

export interface CreateDecisionInput {
  org_id?: string | null;
  title: string;
  context?: string | null;
  owner?: string | null;
  status?: DecisionStatus;
  related_meeting_id?: string | null;
  source_id?: string | null;
}

export interface UpdateDecisionInput {
  title?: string;
  context?: string | null;
  owner?: string | null;
  status?: DecisionStatus;
  related_meeting_id?: string | null;
}

export interface ProfileRepo {
  get(context: StorageContext): Profile | null;
  upsert(context: StorageContext, patch: Partial<Profile>): Profile;
}

export interface SourceRepo {
  list(context: StorageContext): Source[];
  getById(context: StorageContext, id: string): Source | null;
  findByProviderExternal(
    context: StorageContext,
    provider: string,
    externalId: string
  ): Source | null;
  create(context: StorageContext, input: CreateSourceInput): Source;
  markProcessed(context: StorageContext, id: string, processedAt?: string): Source | null;
}

export interface ExtractedItemRepo {
  list(context: StorageContext): ExtractedItem[];
  listBySource(context: StorageContext, sourceId: string): ExtractedItem[];
  listQueue(context: StorageContext, nowIso: string): ExtractedItem[];
  getById(context: StorageContext, id: string): ExtractedItem | null;
  createMany(context: StorageContext, items: CreateExtractedItemInput[]): ExtractedItem[];
  update(context: StorageContext, id: string, patch: Partial<ExtractedItem>): ExtractedItem | null;
}

export interface TaskRepo {
  list(context: StorageContext): Task[];
  getById(context: StorageContext, id: string): Task | null;
  create(context: StorageContext, input: CreateTaskInput): Task;
  update(context: StorageContext, id: string, patch: UpdateTaskInput): Task | null;
  delete(context: StorageContext, id: string): boolean;
}

export interface MeetingRepo {
  list(context: StorageContext): Meeting[];
  getById(context: StorageContext, id: string): Meeting | null;
  create(context: StorageContext, input: CreateMeetingInput): Meeting;
  update(context: StorageContext, id: string, patch: UpdateMeetingInput): Meeting | null;
  delete(context: StorageContext, id: string): boolean;
}

export interface DecisionRepo {
  list(context: StorageContext): Decision[];
  getById(context: StorageContext, id: string): Decision | null;
  create(context: StorageContext, input: CreateDecisionInput): Decision;
  update(context: StorageContext, id: string, patch: UpdateDecisionInput): Decision | null;
}

export interface OrgRepo {
  listByOwner(context: StorageContext): Organization[];
  getById(id: string): Organization | null;
  create(context: StorageContext, name: string): Organization;
}

export interface MemberRepo {
  list(orgId: string): Member[];
  getById(memberId: string): Member | null;
  add(orgId: string, name: string, role: MemberRole): Member;
}

export interface SnapshotRepo {
  getByDate(context: StorageContext, date: string): TodaySnapshot | null;
  upsert(context: StorageContext, date: string, topPriorities: TodayPriority[], risks: Risk[]): TodaySnapshot;
  list(context: StorageContext): TodaySnapshot[];
}

export interface DigestRepo {
  create(
    context: StorageContext,
    kind: DigestKind,
    content: Record<string, unknown>
  ): DigestRecord;
  list(context: StorageContext): DigestRecord[];
}

export interface StorageSystemRepo {
  resetAll(): void;
  seedAll(): void;
  exportAll(): Record<string, unknown>;
}

export interface StorageRepositories {
  profile: ProfileRepo;
  source: SourceRepo;
  extractedItem: ExtractedItemRepo;
  task: TaskRepo;
  meeting: MeetingRepo;
  decision: DecisionRepo;
  org: OrgRepo;
  member: MemberRepo;
  snapshot: SnapshotRepo;
  digest: DigestRepo;
  system: StorageSystemRepo;
}
