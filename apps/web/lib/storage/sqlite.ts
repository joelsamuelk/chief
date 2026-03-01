import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { buildSeedPayload } from "./seeds";
import type {
  CreateDecisionInput,
  CreateExtractedItemInput,
  CreateMeetingInput,
  CreateSourceInput,
  CreateTaskInput,
  Decision,
  DecisionRepo,
  DigestRecord,
  DigestRepo,
  ExtractedItem,
  ExtractedItemRepo,
  Meeting,
  MeetingRepo,
  Member,
  MemberRepo,
  Organization,
  OrgRepo,
  Profile,
  ProfileRepo,
  Risk,
  SnapshotRepo,
  Source,
  SourceRepo,
  StorageContext,
  StorageRepositories,
  StorageSystemRepo,
  Task,
  TaskRepo,
  TodayPriority,
  TodaySnapshot,
  UpdateDecisionInput,
  UpdateMeetingInput,
  UpdateTaskInput
} from "./types";

type SqlRecord = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function localDateOnly(input = new Date()) {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dbFilePath() {
  const configured = process.env.CHIEF_LOCAL_DB_PATH;
  if (configured && configured.trim().length > 0) return configured.trim();
  return path.join(process.cwd(), ".chief-data", "chief-local.sqlite");
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapProfile(row: SqlRecord | undefined): Profile | null {
  if (!row) return null;
  return {
    user_id: String(row.user_id),
    role: row.role ? String(row.role) : null,
    team_size: row.team_size === null || row.team_size === undefined ? null : Number(row.team_size),
    timezone: String(row.timezone),
    work_start: row.work_start ? String(row.work_start) : null,
    work_end: row.work_end ? String(row.work_end) : null,
    work_days: parseJson<string[]>(row.work_days ? String(row.work_days) : null, []),
    proactivity_level: (row.proactivity_level as Profile["proactivity_level"]) ?? "quiet",
    onboarding_completed: Number(row.onboarding_completed ?? 0) === 1,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapSource(row: SqlRecord): Source {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    org_id: row.org_id ? String(row.org_id) : null,
    kind: row.kind as Source["kind"],
    provider: String(row.provider),
    external_id: row.external_id ? String(row.external_id) : null,
    raw_content: String(row.raw_content),
    created_at: String(row.created_at),
    processed_at: row.processed_at ? String(row.processed_at) : null
  };
}

function mapExtractedItem(row: SqlRecord): ExtractedItem {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    org_id: row.org_id ? String(row.org_id) : null,
    source_id: String(row.source_id),
    kind: row.kind as ExtractedItem["kind"],
    status: row.status as ExtractedItem["status"],
    title: String(row.title),
    body: row.body ? String(row.body) : null,
    due_at: row.due_at ? String(row.due_at) : null,
    priority: row.priority as ExtractedItem["priority"],
    confidence: Number(row.confidence ?? 0),
    evidence: parseJson(row.evidence ? String(row.evidence) : null, []),
    model: parseJson<Record<string, unknown>>(row.model ? String(row.model) : null, {}),
    snoozed_until: row.snoozed_until ? String(row.snoozed_until) : null,
    snooze_count: Number(row.snooze_count ?? 0),
    accepted_entity_type: row.accepted_entity_type
      ? (String(row.accepted_entity_type) as ExtractedItem["accepted_entity_type"])
      : null,
    accepted_entity_id: row.accepted_entity_id ? String(row.accepted_entity_id) : null,
    created_at: String(row.created_at)
  };
}

function mapTask(row: SqlRecord): Task {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    org_id: row.org_id ? String(row.org_id) : null,
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    due_at: row.due_at ? String(row.due_at) : null,
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    source_id: row.source_id ? String(row.source_id) : null,
    delegated_to: row.delegated_to ? String(row.delegated_to) : null,
    delegated_by: row.delegated_by ? String(row.delegated_by) : null,
    delegated_acknowledged_at: row.delegated_acknowledged_at ? String(row.delegated_acknowledged_at) : null,
    waiting_on: row.waiting_on ? String(row.waiting_on) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapMeeting(row: SqlRecord): Meeting {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    org_id: row.org_id ? String(row.org_id) : null,
    title: String(row.title),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    attendees: parseJson<Array<{ name: string; email?: string }>>(row.attendees ? String(row.attendees) : null, []),
    notes: row.notes ? String(row.notes) : null,
    source_id: row.source_id ? String(row.source_id) : null,
    created_at: String(row.created_at)
  };
}

function mapDecision(row: SqlRecord): Decision {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    org_id: row.org_id ? String(row.org_id) : null,
    title: String(row.title),
    context: row.context ? String(row.context) : null,
    owner: row.owner ? String(row.owner) : null,
    status: row.status as Decision["status"],
    related_meeting_id: row.related_meeting_id ? String(row.related_meeting_id) : null,
    source_id: row.source_id ? String(row.source_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapOrganization(row: SqlRecord): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    owner_id: String(row.owner_id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapMember(row: SqlRecord): Member {
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    name: String(row.name),
    role: row.role as Member["role"],
    created_at: String(row.created_at)
  };
}

function mapSnapshot(row: SqlRecord): TodaySnapshot {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    org_id: row.org_id ? String(row.org_id) : null,
    date: String(row.date),
    top_priorities: parseJson<TodayPriority[]>(row.top_priorities ? String(row.top_priorities) : null, []),
    risks: parseJson<Risk[]>(row.risks ? String(row.risks) : null, []),
    created_at: String(row.created_at)
  };
}

function mapDigest(row: SqlRecord): DigestRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    org_id: row.org_id ? String(row.org_id) : null,
    kind: row.kind as DigestRecord["kind"],
    content: parseJson<Record<string, unknown>>(row.content ? String(row.content) : null, {}),
    created_at: String(row.created_at)
  };
}

function bootstrap(db: DatabaseSync) {
  db.exec(`
    pragma journal_mode = wal;
    pragma foreign_keys = on;

    create table if not exists profile (
      user_id text primary key,
      role text,
      team_size integer,
      timezone text not null,
      work_start text,
      work_end text,
      work_days text not null default '[]',
      proactivity_level text not null default 'quiet',
      onboarding_completed integer not null default 0,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists organizations (
      id text primary key,
      name text not null,
      owner_id text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists members (
      id text primary key,
      org_id text not null,
      name text not null,
      role text not null,
      created_at text not null
    );

    create table if not exists sources (
      id text primary key,
      user_id text not null,
      org_id text,
      kind text not null,
      provider text not null,
      external_id text,
      raw_content text not null,
      created_at text not null,
      processed_at text
    );
    create index if not exists idx_sources_user_created on sources(user_id, created_at desc);
    create unique index if not exists idx_sources_provider_external
      on sources(user_id, provider, external_id)
      where external_id is not null;

    create table if not exists extracted_items (
      id text primary key,
      user_id text not null,
      org_id text,
      source_id text not null,
      kind text not null,
      status text not null,
      title text not null,
      body text,
      due_at text,
      priority text not null,
      confidence real not null,
      evidence text not null default '[]',
      model text not null default '{}',
      snoozed_until text,
      snooze_count integer not null default 0,
      accepted_entity_type text,
      accepted_entity_id text,
      created_at text not null
    );
    create index if not exists idx_extracted_queue on extracted_items(user_id, status, snoozed_until);
    create index if not exists idx_extracted_source on extracted_items(source_id, created_at desc);

    create table if not exists tasks (
      id text primary key,
      user_id text not null,
      org_id text,
      title text not null,
      description text,
      due_at text,
      priority text not null,
      status text not null,
      source_id text,
      delegated_to text,
      delegated_by text,
      delegated_acknowledged_at text,
      waiting_on text,
      completed_at text,
      created_at text not null,
      updated_at text not null
    );
    create index if not exists idx_tasks_user_status_due on tasks(user_id, status, due_at);

    create table if not exists meetings (
      id text primary key,
      user_id text not null,
      org_id text,
      title text not null,
      start_time text not null,
      end_time text not null,
      attendees text not null default '[]',
      notes text,
      source_id text,
      created_at text not null
    );
    create index if not exists idx_meetings_user_start on meetings(user_id, start_time);

    create table if not exists decisions (
      id text primary key,
      user_id text not null,
      org_id text,
      title text not null,
      context text,
      owner text,
      status text not null,
      related_meeting_id text,
      source_id text,
      created_at text not null,
      updated_at text not null
    );
    create index if not exists idx_decisions_user_status on decisions(user_id, status);

    create table if not exists today_snapshots (
      id text primary key,
      user_id text not null,
      org_id text,
      date text not null,
      top_priorities text not null default '[]',
      risks text not null default '[]',
      created_at text not null
    );
    create unique index if not exists idx_today_unique on today_snapshots(user_id, date);

    create table if not exists digests (
      id text primary key,
      user_id text not null,
      org_id text,
      kind text not null,
      content text not null default '{}',
      created_at text not null
    );
    create index if not exists idx_digests_user_kind on digests(user_id, kind, created_at desc);
  `);

  const row = db.prepare(`select user_id from profile where user_id = ?`).get("local-user") as SqlRecord | undefined;
  if (!row) {
    const now = nowIso();
    db.prepare(`
      insert into profile (
        user_id, role, team_size, timezone, work_start, work_end, work_days,
        proactivity_level, onboarding_completed, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "local-user",
      null,
      null,
      "UTC",
      null,
      null,
      JSON.stringify(["Mon", "Tue", "Wed", "Thu", "Fri"]),
      "quiet",
      0,
      now,
      now
    );
  }
}

function openDatabase() {
  const file = dbFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  bootstrap(db);
  return db;
}

declare global {
  // eslint-disable-next-line no-var
  var __chiefLocalDb: DatabaseSync | undefined;
}

function getDb() {
  if (!globalThis.__chiefLocalDb) {
    globalThis.__chiefLocalDb = openDatabase();
  }
  return globalThis.__chiefLocalDb;
}

function createProfileRepo(db: DatabaseSync): ProfileRepo {
  return {
    get(context) {
      const row = db.prepare(`select * from profile where user_id = ?`).get(context.userId) as SqlRecord | undefined;
      return mapProfile(row);
    },
    upsert(context, patch) {
      const currentRow = db.prepare(`select * from profile where user_id = ?`).get(context.userId) as SqlRecord | undefined;
      const current = mapProfile(currentRow);
      const now = nowIso();

      if (!current) {
        const created: Profile = {
          user_id: context.userId,
          role: patch.role ?? null,
          team_size: patch.team_size ?? null,
          timezone: patch.timezone ?? "UTC",
          work_start: patch.work_start ?? null,
          work_end: patch.work_end ?? null,
          work_days: patch.work_days ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
          proactivity_level: patch.proactivity_level ?? "quiet",
          onboarding_completed: patch.onboarding_completed ?? false,
          created_at: now,
          updated_at: now
        };

        db.prepare(`
          insert into profile (
            user_id, role, team_size, timezone, work_start, work_end, work_days,
            proactivity_level, onboarding_completed, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          created.user_id,
          created.role,
          created.team_size,
          created.timezone,
          created.work_start,
          created.work_end,
          JSON.stringify(created.work_days),
          created.proactivity_level,
          created.onboarding_completed ? 1 : 0,
          created.created_at,
          created.updated_at
        );

        return created;
      }

      const next: Profile = {
        ...current,
        ...patch,
        work_days: patch.work_days ?? current.work_days,
        updated_at: now
      };

      db.prepare(`
        update profile
        set role = ?, team_size = ?, timezone = ?, work_start = ?, work_end = ?, work_days = ?,
            proactivity_level = ?, onboarding_completed = ?, updated_at = ?
        where user_id = ?
      `).run(
        next.role,
        next.team_size,
        next.timezone,
        next.work_start,
        next.work_end,
        JSON.stringify(next.work_days),
        next.proactivity_level,
        next.onboarding_completed ? 1 : 0,
        next.updated_at,
        context.userId
      );

      return next;
    }
  };
}

function createSourceRepo(db: DatabaseSync): SourceRepo {
  return {
    list(context) {
      const rows = db.prepare(`select * from sources where user_id = ? order by created_at desc`).all(context.userId) as SqlRecord[];
      return rows.map(mapSource);
    },
    getById(context, id) {
      const row = db.prepare(`select * from sources where user_id = ? and id = ?`).get(context.userId, id) as SqlRecord | undefined;
      return row ? mapSource(row) : null;
    },
    findByProviderExternal(context, provider, externalId) {
      const row = db
        .prepare(`select * from sources where user_id = ? and provider = ? and external_id = ? limit 1`)
        .get(context.userId, provider, externalId) as SqlRecord | undefined;
      return row ? mapSource(row) : null;
    },
    create(context, input) {
      const id = randomUUID();
      const createdAt = nowIso();
      db.prepare(`
        insert into sources (id, user_id, org_id, kind, provider, external_id, raw_content, created_at, processed_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, null)
      `).run(
        id,
        context.userId,
        input.org_id ?? context.orgId ?? null,
        input.kind,
        input.provider,
        input.external_id ?? null,
        input.raw_content,
        createdAt
      );
      return this.getById(context, id)!;
    },
    markProcessed(context, id, processedAt = nowIso()) {
      db.prepare(`update sources set processed_at = ? where user_id = ? and id = ?`).run(processedAt, context.userId, id);
      return this.getById(context, id);
    }
  };
}

function createExtractedItemRepo(db: DatabaseSync): ExtractedItemRepo {
  return {
    list(context) {
      const rows = db
        .prepare(`select * from extracted_items where user_id = ? order by created_at desc`)
        .all(context.userId) as SqlRecord[];
      return rows.map(mapExtractedItem);
    },
    listBySource(context, sourceId) {
      const rows = db
        .prepare(`select * from extracted_items where user_id = ? and source_id = ? order by created_at desc`)
        .all(context.userId, sourceId) as SqlRecord[];
      return rows.map(mapExtractedItem);
    },
    listQueue(context, nowIsoValue) {
      const rows = db
        .prepare(`
          select * from extracted_items
          where user_id = ?
            and (
              status = 'pending'
              or (status = 'snoozed' and snoozed_until is not null and snoozed_until <= ?)
            )
          order by created_at desc
        `)
        .all(context.userId, nowIsoValue) as SqlRecord[];
      return rows.map(mapExtractedItem);
    },
    getById(context, id) {
      const row = db
        .prepare(`select * from extracted_items where user_id = ? and id = ?`)
        .get(context.userId, id) as SqlRecord | undefined;
      return row ? mapExtractedItem(row) : null;
    },
    createMany(context, items) {
      if (items.length === 0) return [];
      const insert = db.prepare(`
        insert into extracted_items (
          id, user_id, org_id, source_id, kind, status, title, body, due_at, priority,
          confidence, evidence, model, snoozed_until, snooze_count, accepted_entity_type, accepted_entity_id, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const ids: string[] = [];
      db.exec("begin");
      try {
        for (const item of items) {
          const id = randomUUID();
          ids.push(id);
          insert.run(
            id,
            context.userId,
            item.org_id ?? context.orgId ?? null,
            item.source_id,
            item.kind,
            item.status ?? "pending",
            item.title,
            item.body ?? null,
            item.due_at ?? null,
            item.priority ?? "medium",
            item.confidence,
            JSON.stringify(item.evidence),
            JSON.stringify(item.model ?? {}),
            item.snoozed_until ?? null,
            0,
            null,
            null,
            nowIso()
          );
        }
        db.exec("commit");
      } catch (error) {
        db.exec("rollback");
        throw error;
      }

      return ids
        .map((id) => this.getById(context, id))
        .filter((item): item is ExtractedItem => item !== null);
    },
    update(context, id, patch) {
      const current = this.getById(context, id);
      if (!current) return null;

      const next: ExtractedItem = { ...current, ...patch };
      db.prepare(`
        update extracted_items
        set status = ?, title = ?, body = ?, due_at = ?, priority = ?, confidence = ?,
            evidence = ?, model = ?, snoozed_until = ?, snooze_count = ?, accepted_entity_type = ?, accepted_entity_id = ?
        where user_id = ? and id = ?
      `).run(
        next.status,
        next.title,
        next.body,
        next.due_at,
        next.priority,
        next.confidence,
        JSON.stringify(next.evidence),
        JSON.stringify(next.model),
        next.snoozed_until,
        next.snooze_count,
        next.accepted_entity_type,
        next.accepted_entity_id,
        context.userId,
        id
      );

      return this.getById(context, id);
    }
  };
}

function createTaskRepo(db: DatabaseSync): TaskRepo {
  return {
    list(context) {
      const rows = db.prepare(`select * from tasks where user_id = ? order by created_at desc`).all(context.userId) as SqlRecord[];
      return rows.map(mapTask);
    },
    getById(context, id) {
      const row = db.prepare(`select * from tasks where user_id = ? and id = ?`).get(context.userId, id) as SqlRecord | undefined;
      return row ? mapTask(row) : null;
    },
    create(context, input) {
      const id = randomUUID();
      const now = nowIso();
      db.prepare(`
        insert into tasks (
          id, user_id, org_id, title, description, due_at, priority, status, source_id,
          delegated_to, delegated_by, delegated_acknowledged_at, waiting_on, completed_at, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        context.userId,
        input.org_id ?? context.orgId ?? null,
        input.title,
        input.description ?? null,
        input.due_at ?? null,
        input.priority ?? "medium",
        input.status ?? "open",
        input.source_id ?? null,
        input.delegated_to ?? null,
        input.delegated_by ?? null,
        null,
        input.waiting_on ?? null,
        input.status === "completed" ? now : null,
        now,
        now
      );
      return this.getById(context, id)!;
    },
    update(context, id, patch) {
      const current = this.getById(context, id);
      if (!current) return null;

      const next: Task = {
        ...current,
        ...patch,
        updated_at: nowIso()
      };

      db.prepare(`
        update tasks
        set title = ?, description = ?, due_at = ?, priority = ?, status = ?, source_id = ?,
            delegated_to = ?, delegated_by = ?, delegated_acknowledged_at = ?, waiting_on = ?, completed_at = ?, updated_at = ?
        where user_id = ? and id = ?
      `).run(
        next.title,
        next.description,
        next.due_at,
        next.priority,
        next.status,
        next.source_id,
        next.delegated_to,
        next.delegated_by,
        next.delegated_acknowledged_at,
        next.waiting_on,
        next.completed_at,
        next.updated_at,
        context.userId,
        id
      );

      return this.getById(context, id);
    },
    delete(context, id) {
      const result = db.prepare(`delete from tasks where user_id = ? and id = ?`).run(context.userId, id);
      return result.changes > 0;
    }
  };
}

function createMeetingRepo(db: DatabaseSync): MeetingRepo {
  return {
    list(context) {
      const rows = db.prepare(`select * from meetings where user_id = ? order by start_time asc`).all(context.userId) as SqlRecord[];
      return rows.map(mapMeeting);
    },
    getById(context, id) {
      const row = db.prepare(`select * from meetings where user_id = ? and id = ?`).get(context.userId, id) as SqlRecord | undefined;
      return row ? mapMeeting(row) : null;
    },
    create(context, input) {
      const id = randomUUID();
      const createdAt = nowIso();
      db.prepare(`
        insert into meetings (
          id, user_id, org_id, title, start_time, end_time, attendees, notes, source_id, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        context.userId,
        input.org_id ?? context.orgId ?? null,
        input.title,
        input.start_time,
        input.end_time,
        JSON.stringify(input.attendees ?? []),
        input.notes ?? null,
        input.source_id ?? null,
        createdAt
      );
      return this.getById(context, id)!;
    },
    update(context, id, patch) {
      const current = this.getById(context, id);
      if (!current) return null;

      const next: Meeting = {
        ...current,
        ...patch,
        attendees: patch.attendees ?? current.attendees
      };

      db.prepare(`
        update meetings
        set title = ?, start_time = ?, end_time = ?, attendees = ?, notes = ?, source_id = ?
        where user_id = ? and id = ?
      `).run(
        next.title,
        next.start_time,
        next.end_time,
        JSON.stringify(next.attendees),
        next.notes,
        next.source_id,
        context.userId,
        id
      );

      return this.getById(context, id);
    },
    delete(context, id) {
      const result = db.prepare(`delete from meetings where user_id = ? and id = ?`).run(context.userId, id);
      return result.changes > 0;
    }
  };
}

function createDecisionRepo(db: DatabaseSync): DecisionRepo {
  return {
    list(context) {
      const rows = db
        .prepare(`select * from decisions where user_id = ? order by updated_at desc`)
        .all(context.userId) as SqlRecord[];
      return rows.map(mapDecision);
    },
    getById(context, id) {
      const row = db
        .prepare(`select * from decisions where user_id = ? and id = ?`)
        .get(context.userId, id) as SqlRecord | undefined;
      return row ? mapDecision(row) : null;
    },
    create(context, input) {
      const id = randomUUID();
      const now = nowIso();
      db.prepare(`
        insert into decisions (
          id, user_id, org_id, title, context, owner, status, related_meeting_id, source_id, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        context.userId,
        input.org_id ?? context.orgId ?? null,
        input.title,
        input.context ?? null,
        input.owner ?? null,
        input.status ?? "proposed",
        input.related_meeting_id ?? null,
        input.source_id ?? null,
        now,
        now
      );
      return this.getById(context, id)!;
    },
    update(context, id, patch) {
      const current = this.getById(context, id);
      if (!current) return null;

      const next: Decision = {
        ...current,
        ...patch,
        updated_at: nowIso()
      };

      db.prepare(`
        update decisions
        set title = ?, context = ?, owner = ?, status = ?, related_meeting_id = ?, source_id = ?, updated_at = ?
        where user_id = ? and id = ?
      `).run(
        next.title,
        next.context,
        next.owner,
        next.status,
        next.related_meeting_id,
        next.source_id,
        next.updated_at,
        context.userId,
        id
      );

      return this.getById(context, id);
    }
  };
}

function createOrgRepo(db: DatabaseSync): OrgRepo {
  return {
    listByOwner(context) {
      const rows = db
        .prepare(`select * from organizations where owner_id = ? order by created_at asc`)
        .all(context.userId) as SqlRecord[];
      return rows.map(mapOrganization);
    },
    getById(id) {
      const row = db.prepare(`select * from organizations where id = ?`).get(id) as SqlRecord | undefined;
      return row ? mapOrganization(row) : null;
    },
    create(context, name) {
      const id = randomUUID();
      const now = nowIso();
      db.prepare(`insert into organizations (id, name, owner_id, created_at, updated_at) values (?, ?, ?, ?, ?)`).run(
        id,
        name,
        context.userId,
        now,
        now
      );
      return this.getById(id)!;
    }
  };
}

function createMemberRepo(db: DatabaseSync): MemberRepo {
  return {
    list(orgId) {
      const rows = db.prepare(`select * from members where org_id = ? order by created_at asc`).all(orgId) as SqlRecord[];
      return rows.map(mapMember);
    },
    getById(memberId) {
      const row = db.prepare(`select * from members where id = ?`).get(memberId) as SqlRecord | undefined;
      return row ? mapMember(row) : null;
    },
    add(orgId, name, role) {
      const id = randomUUID();
      const createdAt = nowIso();
      db.prepare(`insert into members (id, org_id, name, role, created_at) values (?, ?, ?, ?, ?)`).run(
        id,
        orgId,
        name,
        role,
        createdAt
      );
      return this.getById(id)!;
    }
  };
}

function createSnapshotRepo(db: DatabaseSync): SnapshotRepo {
  return {
    getByDate(context, date) {
      const row = db
        .prepare(`select * from today_snapshots where user_id = ? and date = ? limit 1`)
        .get(context.userId, date) as SqlRecord | undefined;
      return row ? mapSnapshot(row) : null;
    },
    upsert(context, date, topPriorities, risks) {
      const existing = this.getByDate(context, date);
      const now = nowIso();

      if (existing) {
        db.prepare(`
          update today_snapshots
          set top_priorities = ?, risks = ?, created_at = ?
          where user_id = ? and date = ?
        `).run(JSON.stringify(topPriorities), JSON.stringify(risks), now, context.userId, date);
        return this.getByDate(context, date)!;
      }

      db.prepare(`
        insert into today_snapshots (id, user_id, org_id, date, top_priorities, risks, created_at)
        values (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        context.userId,
        context.orgId ?? null,
        date,
        JSON.stringify(topPriorities),
        JSON.stringify(risks),
        now
      );

      return this.getByDate(context, date)!;
    },
    list(context) {
      const rows = db
        .prepare(`select * from today_snapshots where user_id = ? order by date desc`)
        .all(context.userId) as SqlRecord[];
      return rows.map(mapSnapshot);
    }
  };
}

function createDigestRepo(db: DatabaseSync): DigestRepo {
  return {
    create(context, kind, content) {
      const id = randomUUID();
      const createdAt = nowIso();
      db.prepare(`insert into digests (id, user_id, org_id, kind, content, created_at) values (?, ?, ?, ?, ?, ?)`).run(
        id,
        context.userId,
        context.orgId ?? null,
        kind,
        JSON.stringify(content),
        createdAt
      );
      const row = db.prepare(`select * from digests where id = ?`).get(id) as SqlRecord | undefined;
      if (!row) throw new Error("Unable to load digest after creation.");
      return mapDigest(row);
    },
    list(context) {
      const rows = db.prepare(`select * from digests where user_id = ? order by created_at desc`).all(context.userId) as SqlRecord[];
      return rows.map(mapDigest);
    }
  };
}

function createSystemRepo(db: DatabaseSync): StorageSystemRepo {
  return {
    resetAll() {
      db.exec(`
        delete from digests;
        delete from today_snapshots;
        delete from decisions;
        delete from meetings;
        delete from tasks;
        delete from extracted_items;
        delete from sources;
        delete from members;
        delete from organizations;
        delete from profile;
      `);

      const now = nowIso();
      db.prepare(`
        insert into profile (
          user_id, role, team_size, timezone, work_start, work_end, work_days,
          proactivity_level, onboarding_completed, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "local-user",
        null,
        null,
        "UTC",
        null,
        null,
        JSON.stringify(["Mon", "Tue", "Wed", "Thu", "Fri"]),
        "quiet",
        0,
        now,
        now
      );
    },
    seedAll() {
      this.resetAll();
      const seed = buildSeedPayload();
      const now = nowIso();

      db.prepare(`
        update profile
        set role = ?, team_size = ?, timezone = ?, work_start = ?, work_end = ?, work_days = ?,
            proactivity_level = ?, onboarding_completed = ?, updated_at = ?
        where user_id = ?
      `).run(
        seed.profile.role,
        seed.profile.team_size,
        seed.profile.timezone,
        seed.profile.work_start,
        seed.profile.work_end,
        JSON.stringify(seed.profile.work_days),
        seed.profile.proactivity_level,
        seed.profile.onboarding_completed ? 1 : 0,
        now,
        "local-user"
      );

      const orgId = randomUUID();
      db.prepare(`insert into organizations (id, name, owner_id, created_at, updated_at) values (?, ?, ?, ?, ?)`).run(
        orgId,
        seed.organizationName,
        "local-user",
        now,
        now
      );

      db.prepare(`insert into members (id, org_id, name, role, created_at) values (?, ?, ?, ?, ?)`).run(
        "member-001",
        orgId,
        "Joel Samuel",
        "executive",
        now
      );

      seed.members.forEach((member, index) => {
        db.prepare(`insert into members (id, org_id, name, role, created_at) values (?, ?, ?, ?, ?)`).run(
          `member-${String(index + 2).padStart(3, "0")}`,
          orgId,
          member.name,
          member.role,
          nowIso()
        );
      });

      for (const source of seed.sources) {
        db.prepare(`
          insert into sources (id, user_id, org_id, kind, provider, external_id, raw_content, created_at, processed_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          source.forced_id,
          "local-user",
          orgId,
          source.kind,
          source.provider,
          source.external_id ?? null,
          source.raw_content,
          nowIso(),
          null
        );
      }

      for (const meeting of seed.meetings) {
        db.prepare(`
          insert into meetings (id, user_id, org_id, title, start_time, end_time, attendees, notes, source_id, created_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          meeting.forced_id,
          "local-user",
          orgId,
          meeting.title,
          meeting.start_time,
          meeting.end_time,
          JSON.stringify(meeting.attendees ?? []),
          meeting.notes ?? null,
          meeting.source_id ?? null,
          nowIso()
        );
      }

      for (const task of seed.tasks) {
        db.prepare(`
          insert into tasks (
            id, user_id, org_id, title, description, due_at, priority, status, source_id,
            delegated_to, delegated_by, delegated_acknowledged_at, waiting_on, completed_at, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          task.forced_id,
          "local-user",
          orgId,
          task.title,
          task.description ?? null,
          task.due_at ?? null,
          task.priority ?? "medium",
          task.status ?? "open",
          task.source_id ?? null,
          task.delegated_to ?? null,
          task.delegated_by ?? null,
          null,
          task.waiting_on ?? null,
          task.status === "completed" ? nowIso() : null,
          nowIso(),
          nowIso()
        );
      }

      for (const decision of seed.decisions) {
        db.prepare(`
          insert into decisions (
            id, user_id, org_id, title, context, owner, status, related_meeting_id, source_id, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          decision.forced_id,
          "local-user",
          orgId,
          decision.title,
          decision.context ?? null,
          decision.owner ?? null,
          decision.status ?? "proposed",
          decision.related_meeting_id ?? null,
          decision.source_id ?? null,
          nowIso(),
          nowIso()
        );
      }

      for (const item of seed.extractedItems) {
        db.prepare(`
          insert into extracted_items (
            id, user_id, org_id, source_id, kind, status, title, body, due_at, priority,
            confidence, evidence, model, snoozed_until, snooze_count, accepted_entity_type, accepted_entity_id, created_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.forced_id,
          "local-user",
          orgId,
          item.source_id,
          item.kind,
          item.status ?? "pending",
          item.title,
          item.body ?? null,
          item.due_at ?? null,
          item.priority ?? "medium",
          item.confidence,
          JSON.stringify(item.evidence),
          JSON.stringify(item.model ?? {}),
          item.snoozed_until ?? null,
          item.status === "snoozed" ? 2 : 0,
          null,
          null,
          nowIso()
        );
      }

      const today = localDateOnly();
      db.prepare(`
        insert into today_snapshots (id, user_id, org_id, date, top_priorities, risks, created_at)
        values (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        "local-user",
        orgId,
        today,
        JSON.stringify([
          { task_id: "task-001", title: "Review Q2 board draft", due_at: null, priority: "high", score: 6 },
          { task_id: "task-003", title: "Approve roadmap update", due_at: null, priority: "high", score: 5 },
          { task_id: "task-009", title: "Update KPI pack", due_at: null, priority: "high", score: 5 }
        ]),
        JSON.stringify([]),
        nowIso()
      );
    },
    exportAll() {
      const tables = [
        "profile",
        "organizations",
        "members",
        "sources",
        "extracted_items",
        "tasks",
        "meetings",
        "decisions",
        "today_snapshots",
        "digests"
      ];

      const out: Record<string, unknown> = {};
      for (const table of tables) {
        out[table] = db.prepare(`select * from ${table}`).all();
      }
      return out;
    }
  };
}

export function getStorageRepositories(): StorageRepositories {
  const db = getDb();
  return {
    profile: createProfileRepo(db),
    source: createSourceRepo(db),
    extractedItem: createExtractedItemRepo(db),
    task: createTaskRepo(db),
    meeting: createMeetingRepo(db),
    decision: createDecisionRepo(db),
    org: createOrgRepo(db),
    member: createMemberRepo(db),
    snapshot: createSnapshotRepo(db),
    digest: createDigestRepo(db),
    system: createSystemRepo(db)
  };
}
