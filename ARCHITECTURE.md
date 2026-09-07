# iSN Compass — System Architecture

A single-admin initiative & task tracker. Team members are never given accounts;
they interact only through email.

## A. System Architecture

```
                    ┌───────────────────────────────┐
                    │           Next.js App          │
                    │   (app)/...   route group       │  <- Admin-only pages, session-gated
                    │   /login, /confirm/[token]      │  <- public
                    │   /api/cron/reminders            │  <- public, secret-gated
                    │        Server Actions            │
                    │              │                    │
                    │      src/server/services/*        │  <- typed service layer
                    │              │                    │
                    └──────────────┼────────────────────┘
                                   │ supabase-js (server client, RLS-aware)
                    ┌──────────────▼────────────────────┐
                    │              Supabase              │
                    │      Postgres + Auth + RLS         │
                    └─────────────────────────────────────┘
                                   │
                                   ▼
                              Resend (email)
```

Key decisions:
- **Single tenant, single Admin.** No organizations table, no roles/permissions. RLS policy on every table is just "the authenticated user" — there is only ever one, the Admin.
- **Team members are a directory, not accounts.** `team_members` holds name/email/department only; they never authenticate. All interaction is via outbound email + a token-based, no-login confirmation link.
- **Service layer (`src/server/services/*`)** wraps all reads/writes with typed functions; server actions in `src/server/actions/*` call them and are the only write path from the UI.
- **Two write paths bypass session auth on purpose**, both via the service-role client (`src/lib/supabase/admin.ts`):
  - `src/app/confirm/[token]/page.tsx` — validates a per-task `confirmation_token` before writing.
  - `src/app/api/cron/reminders/route.ts` — validates a `CRON_SECRET` bearer token (Vercel Cron, see `vercel.json`).
- Validation with plain server-action argument checks; forms use shadcn/`@base-ui` components.

## B. Database ER Model

```
departments 1─* team_members
departments 1─* initiatives
initiatives 1─* tasks
tasks *─1 team_members (assigned_to)
initiatives / tasks 1─* activity_log (polymorphic: entity_type + entity_id, append-only)
```

See `supabase/migrations/20260101000001_init.sql` (+ two follow-up migrations for
`initiatives.is_archived` and `tasks.assignment_note`) for the exact schema.

## C. Email flow

1. Admin assigns a task (`createTask` / `reassignTask` in `src/server/services/tasks.ts`) → assignment email via Resend (`src/lib/email/templates.ts`), containing a link to `/confirm/[token]`.
2. `/api/cron/reminders` runs daily (`vercel.json`), emailing anyone with a task due soon or overdue that hasn't been reminded today.
3. The team member clicks the link — no login. `src/server/actions/confirm.ts` validates the token, flips the task to `completion_confirmed`, logs it, and emails `ADMIN_EMAIL`.
4. The Admin reviews and marks the task `completed` (or rejects/reopens it, which regenerates the token).

## D. Sitemap (`/...`, all under the `(app)` route group except where noted)

`dashboard` (summary + cross-cutting filters) · `initiatives` · `initiatives/[id]` (tabs: overview, tasks, activity) · `departments` · `departments/[id]` · `team-members` · `team-members/[id]` · `activity` · `/login` (public) · `/confirm/[token]` (public)

## E. Folder Architecture
```
src/
  app/
    (app)/...                          # Admin-only pages, shared layout/shell
    login/, confirm/[token]/            # public
    api/cron/reminders/                 # public, secret-gated
  components/
    ui/                                # shadcn primitives
    shared/, initiative/                # app shell, nav, form-dialog, badges, initiative tabs
  server/
    services/                          # departments, team-members, initiatives, tasks, dashboard, activity
    actions/                           # 'use server' actions calling services
    auth/                              # session helper (single admin)
  lib/
    supabase/                          # server.ts, client.ts, middleware.ts, admin.ts (service-role)
    email/                             # resend.ts, templates.ts
  types/                               # database.ts (hand-written to match migrations)
supabase/
  migrations/
scripts/
  seed-demo.ts
```
