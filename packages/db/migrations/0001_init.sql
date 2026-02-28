create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean not null default false,
  category text not null default 'work' check (category in ('work', 'personal', 'health', 'finance')),
  priority text not null default 'med' check (priority in ('low', 'med', 'high')),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  notes text,
  category text not null default 'work' check (category in ('work', 'personal', 'health', 'finance')),
  created_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  context text,
  outcome text,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  focus text not null,
  created_at timestamptz not null default now(),
  unique(user_id, week_start)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.decisions enable row level security;
alter table public.weekly_focus enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks for select
using (user_id = auth.uid());

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks for delete
using (user_id = auth.uid());

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events for select
using (user_id = auth.uid());

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
on public.events for delete
using (user_id = auth.uid());

drop policy if exists "decisions_select_own" on public.decisions;
create policy "decisions_select_own"
on public.decisions for select
using (user_id = auth.uid());

drop policy if exists "decisions_insert_own" on public.decisions;
create policy "decisions_insert_own"
on public.decisions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "decisions_update_own" on public.decisions;
create policy "decisions_update_own"
on public.decisions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "decisions_delete_own" on public.decisions;
create policy "decisions_delete_own"
on public.decisions for delete
using (user_id = auth.uid());

drop policy if exists "weekly_focus_select_own" on public.weekly_focus;
create policy "weekly_focus_select_own"
on public.weekly_focus for select
using (user_id = auth.uid());

drop policy if exists "weekly_focus_insert_own" on public.weekly_focus;
create policy "weekly_focus_insert_own"
on public.weekly_focus for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "weekly_focus_update_own" on public.weekly_focus;
create policy "weekly_focus_update_own"
on public.weekly_focus for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "weekly_focus_delete_own" on public.weekly_focus;
create policy "weekly_focus_delete_own"
on public.weekly_focus for delete
using (user_id = auth.uid());
