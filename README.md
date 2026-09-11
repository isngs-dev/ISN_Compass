# iSN Compass

A simple, centralized tool for tracking departments, initiatives, and tasks. One
Admin uses the app; team members are never given logins — they interact only
through email (task assignment, reminders, and a one-click "Confirm Completion"
link).

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, RLS) + Resend (email) + a scheduled
cron hit against `/api/cron/reminders` (Vercel Cron if hosted there, a Render Cron Job
otherwise).

## Setup

1. `pnpm install`
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` — from your Supabase project (Project Settings > API / Database).
   - `RESEND_API_KEY`, `EMAIL_FROM` — from [resend.com](https://resend.com); `EMAIL_FROM` must be on a domain verified in Resend.
   - `ADMIN_EMAIL` — where "completion confirmed" notifications are sent.
   - `CRON_SECRET` — any random string; whatever calls `/api/cron/reminders` on a schedule (Vercel Cron, or a Render Cron Job) must send it as `Authorization: Bearer <value>`.
   - `NEXT_PUBLIC_SITE_URL` — the deployed app's URL (used to build links inside emails).
3. Apply the database schema in `supabase/migrations/` against your Supabase project (via the SQL Editor, or `psql "$DATABASE_URL" -f supabase/migrations/<file>.sql` for each file in order).
4. Create the one Admin account in Supabase: Dashboard > Authentication > Users > Add user (email + password). There's no self-serve signup by design.
5. Optionally seed demo data: `pnpm seed` (requires the service role key; does not create the Admin login).
6. `pnpm dev` and sign in at `/login`.

## How it works

- The Admin manages departments, a team-member directory, initiatives, and tasks.
- Assigning a task emails the team member (name/email only — no account) with the
  task details and a **Confirm Completion** link that needs no login.
- A daily cron hit against `/api/cron/reminders` emails a reminder for tasks that
  are due soon or overdue.
- When the team member clicks the link, the task is marked Completed directly and
  the Admin gets an email; the Admin can still reopen it from the dashboard if that
  turns out to be wrong.
- Every significant action is recorded in the Activity log.

## Deploying

Whichever platform you use, every env var above must be set there (Production
environment) — `NEXT_PUBLIC_*` vars are baked in at build time, so set them before
the first deploy or trigger a fresh build afterward.

**Vercel**: the cron schedule in `vercel.json` is picked up automatically on deploy.

**Render**: `vercel.json` has no effect — create a separate **Cron Job** resource
(not part of the web service) that runs on your chosen schedule and executes:
```
curl -fsS -X GET "$SITE_URL/api/cron/reminders" -H "Authorization: Bearer $CRON_SECRET"
```
with `SITE_URL` and `CRON_SECRET` set as env vars on that Cron Job resource. The
web service itself just needs Build Command `pnpm build`, Start Command `pnpm start`.
Set `NEXT_PUBLIC_SITE_URL` to the Render service's own URL (e.g.
`https://isn-compass.onrender.com`), not `localhost` — email links are built from it.
