# Chief

Chief is an executive operating system (calendar + tasks + briefings) built as a monorepo with shared design tokens and UI primitives for web and mobile.

## Stack

- Monorepo: `pnpm` workspaces + Turborepo
- Web: Next.js 14 (App Router), TailwindCSS, Radix UI, TanStack Query, Framer Motion
- Mobile: Expo (React Native), NativeWind, React Navigation, Reanimated
- Backend: Supabase (schema + RLS + seed SQL in `packages/db`)

## Repo Structure

- `apps/web` Next.js app shell + desktop layout
- `apps/mobile` Expo app with tabs + modal sheet flows
- `packages/theme` design tokens + Tailwind preset
- `packages/ui` shared primitives (`/web` + `/mobile` exports)
- `packages/types` shared typed models
- `packages/data` Supabase client + CRUD + React Query hooks
- `packages/db` SQL migrations + seed data

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure env vars:

Web (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Mobile (`apps/mobile/.env` or Expo env)

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Apply SQL in Supabase:

- Run migration: `packages/db/migrations/0001_init.sql`
- Run seed: `packages/db/seeds/0001_seed.sql`

4. Start development:

```bash
pnpm dev
```

Or per app:

```bash
pnpm --filter @chief/web dev
pnpm --filter @chief/mobile dev
```

## Core Flows Implemented

- Day/Week/Month calendar modes
- Task filters: All / Today / Upcoming / Completed
- Add/edit/delete task (web modal + mobile bottom sheet)
- Mark task done / reopen
- Add/edit event (web modal + mobile bottom sheet)
- Executive desktop shell: sidebar + main + right rail
- Mobile tabs: Today / Calendar / Tasks / Profile

## Notes

- `packages/data` uses Supabase when env vars are present.
- If env vars are missing, it falls back to in-memory seeded data for local UI development.
