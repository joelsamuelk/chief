-- Replace with a real auth.users id for local development if needed.
-- This seed is only for visual development and mirrors the reference screens.

insert into public.profiles (id, name, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Joel', 'America/New_York')
on conflict (id) do nothing;

insert into public.events (id, user_id, title, start_at, end_at, category)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Create Report for SwiftDoc.', now()::date + time '09:30', now()::date + time '10:30', 'work'),
  ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', 'Lunch with Diana Rose', now()::date + time '13:00', now()::date + time '14:00', 'personal'),
  ('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000001', 'Meeting with manager', now()::date + time '14:30', now()::date + time '15:30', 'work')
on conflict (id) do nothing;

insert into public.tasks (id, user_id, title, all_day, category, priority, status, start_at, end_at)
values
  ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', 'Clean your desk', true, 'personal', 'med', 'open', null, null),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Doing workouts', true, 'health', 'med', 'open', null, null),
  ('22222222-2222-2222-2222-222222222223', '00000000-0000-0000-0000-000000000001', 'Write weekly brief', false, 'work', 'high', 'open', now()::date + time '16:00', now()::date + time '16:30'),
  ('22222222-2222-2222-2222-222222222224', '00000000-0000-0000-0000-000000000001', 'Prepare board update', false, 'work', 'high', 'open', now()::date + time '17:00', now()::date + time '18:00')
on conflict (id) do nothing;

insert into public.weekly_focus (user_id, week_start, focus)
values ('00000000-0000-0000-0000-000000000001', date_trunc('week', now())::date, 'Drive executive clarity and protect deep work blocks.')
on conflict (user_id, week_start) do nothing;
