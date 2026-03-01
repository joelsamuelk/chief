# Chief

Chief is a web-first Executive Operating System built for structured leadership clarity.

## Local Mode (Current)

This build runs in **local mode**:

- No Supabase
- No OAuth
- No external AI APIs
- Persistence via local SQLite (`apps/web/.chief-data/chief-local.sqlite`)
- API + service + repository architecture designed to swap storage later

## Stack

- Monorepo: `pnpm` workspaces + Turborepo
- Web: Next.js 14 App Router + TypeScript + Tailwind
- Font: Outfit
- Data: local SQLite (`node:sqlite`) through repository interfaces

## Architecture

### Storage abstraction

`apps/web/lib/storage/`

- `types.ts` shared domain types + repo interfaces
- `sqlite.ts` local SQLite repository implementation
- `seeds.ts` realistic seed dataset
- `index.ts` repository/context entrypoint

### Service layer

`apps/web/lib/services/`

- onboarding, sources, extraction, queue, tasks, meetings, decisions
- today, memory, team, assist, notifications, settings

All feature logic goes through services + repositories.

### API layer

`apps/web/app/api/*`

Route handlers are thin controllers that validate input, call services, and return JSON.

## Web routes

- `/app/onboarding`
- `/app/today`
- `/app/queue`
- `/app/tasks`
- `/app/meetings`
- `/app/memory`
- `/app/team`
- `/app/decisions`
- `/app/assist`
- `/app/settings`

## Run

```bash
pnpm install
pnpm --filter @chief/web dev
```

Then open `http://localhost:3000`.

## Seed, reset, export (UI)

Go to `/app/settings`:

- Seed sample data
- Reset local data
- Export local JSON
- Import sample emails/meetings
- Create shared text sources

## Tests

Minimal local tests are included for:

- extraction parsing
- queue accept -> task creation
- today priority computation

Run:

```bash
pnpm --filter @chief/web test:local
```

## Typecheck

```bash
pnpm --filter @chief/data typecheck
pnpm --filter @chief/web typecheck
```

## Note on build in this environment

`next build` may fail here if outbound network to Google Fonts is blocked.

## Swapping to Supabase later

The swap point is the storage boundary:

1. Keep service + API contracts unchanged.
2. Add a Supabase-backed repository implementation parallel to `sqlite.ts`.
3. Switch `getStorageRepositories()` binding by environment.
4. Retain the same domain types and service methods.

This keeps UI and API routes stable while moving persistence from local SQLite to Supabase.
