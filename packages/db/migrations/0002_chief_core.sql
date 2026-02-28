create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'executive', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.chief_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  role text,
  team_size integer,
  timezone text not null default 'UTC',
  work_start time,
  work_end time,
  work_days text[] not null default array['mon', 'tue', 'wed', 'thu', 'fri'],
  proactivity_level text not null default 'quiet' check (proactivity_level in ('reactive', 'quiet', 'strong')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (team_size is null or team_size >= 1),
  check (work_days <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
);

alter table public.chief_profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create table if not exists public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  provider text not null check (provider in ('google', 'microsoft')),
  provider_user_id text not null,
  access_token_encrypted bytea,
  refresh_token_encrypted bytea,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_user_id)
);

alter table public.oauth_connections
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  kind text not null check (kind in ('email', 'meeting', 'shared_text', 'manual')),
  provider text not null,
  external_id text,
  raw_content text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.sources
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create unique index if not exists idx_sources_dedupe
on public.sources(user_id, provider, external_id)
where external_id is not null;

create table if not exists public.extracted_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  source_id uuid not null references public.sources(id) on delete cascade,
  kind text not null check (kind in ('task', 'decision', 'follow_up', 'risk', 'summary')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed', 'snoozed')),
  title text not null,
  body text,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  confidence numeric(5, 4) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '[]'::jsonb,
  model jsonb not null default '{}'::jsonb,
  snoozed_until timestamptz,
  snooze_count integer not null default 0,
  accepted_entity_type text,
  accepted_entity_id uuid,
  created_at timestamptz not null default now(),
  check (accepted_entity_type is null or accepted_entity_type in ('task', 'decision'))
);

alter table public.extracted_items
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

alter table public.tasks
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists description text,
  add column if not exists due_at timestamptz,
  add column if not exists source_id uuid references public.sources(id) on delete set null,
  add column if not exists delegated_to uuid references auth.users(id) on delete set null,
  add column if not exists delegated_by uuid references auth.users(id) on delete set null,
  add column if not exists delegated_acknowledged_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks drop constraint if exists tasks_priority_check;

alter table public.tasks
  add constraint tasks_status_check
    check (status in ('open', 'done', 'completed', 'archived', 'waiting')),
  add constraint tasks_priority_check
    check (priority in ('low', 'med', 'medium', 'high'));

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  attendees jsonb not null default '[]'::jsonb,
  notes text,
  source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_time >= start_time)
);

alter table public.meetings
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

alter table public.decisions
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists owner text,
  add column if not exists status text not null default 'proposed' check (status in ('proposed', 'approved', 'implemented')),
  add column if not exists related_meeting_id uuid references public.meetings(id) on delete set null,
  add column if not exists source_id uuid references public.sources(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.decision_task_links (
  decision_id uuid not null references public.decisions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (decision_id, task_id)
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  provider text not null,
  model text not null,
  status text not null,
  latency_ms integer,
  created_at timestamptz not null default now(),
  check (latency_ms is null or latency_ms >= 0)
);

alter table public.ai_runs
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create table if not exists public.today_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  date date not null,
  top_priorities jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.today_snapshots
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create unique index if not exists idx_today_snapshots_user_date_personal
on public.today_snapshots(user_id, date)
where org_id is null;

create unique index if not exists idx_today_snapshots_user_org_date
on public.today_snapshots(user_id, org_id, date)
where org_id is not null;

create index if not exists idx_organizations_owner_id on public.organizations(owner_id);
create index if not exists idx_organization_members_user_id on public.organization_members(user_id);
create index if not exists idx_chief_profiles_org_id on public.chief_profiles(org_id);
create index if not exists idx_sources_user_created_at on public.sources(user_id, created_at desc);
create index if not exists idx_sources_org_created_at on public.sources(org_id, created_at desc);
create index if not exists idx_extracted_items_user_status_created_at on public.extracted_items(user_id, status, created_at desc);
create index if not exists idx_extracted_items_source_id on public.extracted_items(source_id);
create index if not exists idx_extracted_items_snoozed_until on public.extracted_items(snoozed_until);
create index if not exists idx_tasks_user_status_due_at on public.tasks(user_id, status, due_at);
create index if not exists idx_tasks_org_status_due_at on public.tasks(org_id, status, due_at);
create index if not exists idx_tasks_delegated_to_status on public.tasks(delegated_to, status);
create index if not exists idx_meetings_user_start_time on public.meetings(user_id, start_time);
create index if not exists idx_meetings_org_start_time on public.meetings(org_id, start_time);
create index if not exists idx_decisions_user_status_updated_at on public.decisions(user_id, status, updated_at desc);
create index if not exists idx_decisions_org_status_updated_at on public.decisions(org_id, status, updated_at desc);
create index if not exists idx_ai_runs_user_created_at on public.ai_runs(user_id, created_at desc);
create index if not exists idx_ai_runs_source_id on public.ai_runs(source_id);
create index if not exists idx_oauth_connections_user_provider on public.oauth_connections(user_id, provider);

create or replace function public.is_org_member(target_org_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.org_id = target_org_id
      and om.user_id = target_user_id
  )
  or exists (
    select 1
    from public.organizations o
    where o.id = target_org_id
      and o.owner_id = target_user_id
  );
$$;

create or replace function public.is_org_admin_or_owner(target_org_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = target_org_id
      and o.owner_id = target_user_id
  )
  or exists (
    select 1
    from public.organization_members om
    where om.org_id = target_org_id
      and om.user_id = target_user_id
      and om.role = 'admin'
  );
$$;

create or replace function public.encrypt_oauth_token(plain_token text)
returns bytea
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  encryption_key text;
begin
  encryption_key := current_setting('app.settings.oauth_encryption_key', true);
  if encryption_key is null then
    return null;
  end if;

  return pgp_sym_encrypt(plain_token, encryption_key);
end;
$$;

create or replace function public.decrypt_oauth_token(cipher_token bytea)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  encryption_key text;
begin
  encryption_key := current_setting('app.settings.oauth_encryption_key', true);
  if encryption_key is null then
    return null;
  end if;

  return pgp_sym_decrypt(cipher_token, encryption_key);
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists chief_profiles_set_updated_at on public.chief_profiles;
create trigger chief_profiles_set_updated_at
before update on public.chief_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists decisions_set_updated_at on public.decisions;
create trigger decisions_set_updated_at
before update on public.decisions
for each row
execute function public.set_updated_at();

drop trigger if exists oauth_connections_set_updated_at on public.oauth_connections;
create trigger oauth_connections_set_updated_at
before update on public.oauth_connections
for each row
execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organizations force row level security;
alter table public.organization_members enable row level security;
alter table public.organization_members force row level security;
alter table public.chief_profiles enable row level security;
alter table public.chief_profiles force row level security;
alter table public.oauth_connections enable row level security;
alter table public.oauth_connections force row level security;
alter table public.sources enable row level security;
alter table public.sources force row level security;
alter table public.extracted_items enable row level security;
alter table public.extracted_items force row level security;
alter table public.tasks enable row level security;
alter table public.tasks force row level security;
alter table public.meetings enable row level security;
alter table public.meetings force row level security;
alter table public.decisions enable row level security;
alter table public.decisions force row level security;
alter table public.decision_task_links enable row level security;
alter table public.decision_task_links force row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_runs force row level security;
alter table public.today_snapshots enable row level security;
alter table public.today_snapshots force row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select
on public.organizations for select
using (owner_id = auth.uid() or public.is_org_member(id, auth.uid()));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert
on public.organizations for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update
on public.organizations for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete
on public.organizations for delete
using (owner_id = auth.uid());

drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select
on public.organization_members for select
using (user_id = auth.uid() or public.is_org_member(org_id, auth.uid()));

drop policy if exists organization_members_insert on public.organization_members;
create policy organization_members_insert
on public.organization_members for insert
to authenticated
with check (public.is_org_admin_or_owner(org_id, auth.uid()));

drop policy if exists organization_members_update on public.organization_members;
create policy organization_members_update
on public.organization_members for update
using (public.is_org_admin_or_owner(org_id, auth.uid()))
with check (public.is_org_admin_or_owner(org_id, auth.uid()));

drop policy if exists organization_members_delete on public.organization_members;
create policy organization_members_delete
on public.organization_members for delete
using (public.is_org_admin_or_owner(org_id, auth.uid()));

drop policy if exists chief_profiles_select on public.chief_profiles;
create policy chief_profiles_select
on public.chief_profiles for select
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id, auth.uid())));

drop policy if exists chief_profiles_insert on public.chief_profiles;
create policy chief_profiles_insert
on public.chief_profiles for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists chief_profiles_update on public.chief_profiles;
create policy chief_profiles_update
on public.chief_profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists chief_profiles_delete on public.chief_profiles;
create policy chief_profiles_delete
on public.chief_profiles for delete
using (user_id = auth.uid());

drop policy if exists oauth_connections_select on public.oauth_connections;
create policy oauth_connections_select
on public.oauth_connections for select
using (user_id = auth.uid());

drop policy if exists oauth_connections_insert on public.oauth_connections;
create policy oauth_connections_insert
on public.oauth_connections for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists oauth_connections_update on public.oauth_connections;
create policy oauth_connections_update
on public.oauth_connections for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists oauth_connections_delete on public.oauth_connections;
create policy oauth_connections_delete
on public.oauth_connections for delete
using (user_id = auth.uid());

drop policy if exists sources_select on public.sources;
create policy sources_select
on public.sources for select
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id, auth.uid())));

drop policy if exists sources_insert on public.sources;
create policy sources_insert
on public.sources for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists sources_update on public.sources;
create policy sources_update
on public.sources for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists sources_delete on public.sources;
create policy sources_delete
on public.sources for delete
using (user_id = auth.uid());

drop policy if exists extracted_items_select on public.extracted_items;
create policy extracted_items_select
on public.extracted_items for select
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id, auth.uid())));

drop policy if exists extracted_items_insert on public.extracted_items;
create policy extracted_items_insert
on public.extracted_items for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists extracted_items_update on public.extracted_items;
create policy extracted_items_update
on public.extracted_items for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists extracted_items_delete on public.extracted_items;
create policy extracted_items_delete
on public.extracted_items for delete
using (user_id = auth.uid());

drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_insert_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

create policy tasks_select
on public.tasks for select
using (
  user_id = auth.uid()
  or delegated_to = auth.uid()
  or (org_id is not null and public.is_org_member(org_id, auth.uid()))
);

create policy tasks_insert
on public.tasks for insert
to authenticated
with check (
  user_id = auth.uid()
  and (org_id is null or public.is_org_member(org_id, auth.uid()))
);

create policy tasks_update
on public.tasks for update
using (
  user_id = auth.uid()
  or delegated_to = auth.uid()
)
with check (
  (user_id = auth.uid() or delegated_to = auth.uid())
  and (org_id is null or public.is_org_member(org_id, auth.uid()))
);

create policy tasks_delete
on public.tasks for delete
using (user_id = auth.uid());

drop policy if exists meetings_select on public.meetings;
create policy meetings_select
on public.meetings for select
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id, auth.uid())));

drop policy if exists meetings_insert on public.meetings;
create policy meetings_insert
on public.meetings for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists meetings_update on public.meetings;
create policy meetings_update
on public.meetings for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists meetings_delete on public.meetings;
create policy meetings_delete
on public.meetings for delete
using (user_id = auth.uid());

drop policy if exists decisions_select_own on public.decisions;
drop policy if exists decisions_insert_own on public.decisions;
drop policy if exists decisions_update_own on public.decisions;
drop policy if exists decisions_delete_own on public.decisions;
drop policy if exists decisions_select on public.decisions;
drop policy if exists decisions_insert on public.decisions;
drop policy if exists decisions_update on public.decisions;
drop policy if exists decisions_delete on public.decisions;

create policy decisions_select
on public.decisions for select
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id, auth.uid())));

create policy decisions_insert
on public.decisions for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

create policy decisions_update
on public.decisions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy decisions_delete
on public.decisions for delete
using (user_id = auth.uid());

drop policy if exists decision_task_links_select on public.decision_task_links;
create policy decision_task_links_select
on public.decision_task_links for select
using (
  exists (
    select 1 from public.decisions d
    where d.id = decision_task_links.decision_id
      and (d.user_id = auth.uid() or (d.org_id is not null and public.is_org_member(d.org_id, auth.uid())))
  )
);

drop policy if exists decision_task_links_insert on public.decision_task_links;
create policy decision_task_links_insert
on public.decision_task_links for insert
to authenticated
with check (
  exists (
    select 1 from public.decisions d
    where d.id = decision_task_links.decision_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists decision_task_links_delete on public.decision_task_links;
create policy decision_task_links_delete
on public.decision_task_links for delete
using (
  exists (
    select 1 from public.decisions d
    where d.id = decision_task_links.decision_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists ai_runs_select on public.ai_runs;
create policy ai_runs_select
on public.ai_runs for select
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id, auth.uid())));

drop policy if exists ai_runs_insert on public.ai_runs;
create policy ai_runs_insert
on public.ai_runs for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists ai_runs_update on public.ai_runs;
create policy ai_runs_update
on public.ai_runs for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ai_runs_delete on public.ai_runs;
create policy ai_runs_delete
on public.ai_runs for delete
using (user_id = auth.uid());

drop policy if exists today_snapshots_select on public.today_snapshots;
create policy today_snapshots_select
on public.today_snapshots for select
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id, auth.uid())));

drop policy if exists today_snapshots_insert on public.today_snapshots;
create policy today_snapshots_insert
on public.today_snapshots for insert
to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id, auth.uid())));

drop policy if exists today_snapshots_update on public.today_snapshots;
create policy today_snapshots_update
on public.today_snapshots for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists today_snapshots_delete on public.today_snapshots;
create policy today_snapshots_delete
on public.today_snapshots for delete
using (user_id = auth.uid());
