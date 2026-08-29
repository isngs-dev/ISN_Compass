# iSN Compass — System Architecture

Strategy → Accountability → Execution

## A. System Architecture

**Single Next.js 15 (App Router) application, two portals, one backend.**

```
                         ┌─────────────────────────────┐
                         │        Next.js App          │
                         │ ┌─────────────┐┌───────────┐│
                         │ │(leadership) ││  (team)   ││   route groups
                         │ │  portal     ││  portal   ││
                         │ └─────────────┘└───────────┘│
                         │        Server Actions /      │
                         │        Route Handlers        │
                         │              │                │
                         │      src/server/services/*    │  <- typed service layer
                         │   (initiatives, tasks, ...)   │      (used today by UI,
                         │              │                │       used later by AI)
                         └──────────────┼────────────────┘
                                        │ supabase-js (server client, RLS-aware)
                         ┌──────────────▼────────────────┐
                         │           Supabase             │
                         │  Postgres + Auth + RLS +       │
                         │  Storage (documents) + Realtime │
                         └─────────────────────────────────┘
```

Key decisions:
- **One codebase, one DB.** Portals are Next.js route groups `(leadership)` and `(team)` sharing layouts, components, and the same Postgres schema — not separate apps. RBAC + RLS decide what each portal/user can see, not separate deployments.
- **Service layer (`src/server/services/*`)** wraps all reads/writes (initiatives, tasks, delegation, health scores, meetings, etc.) with typed functions. UI (server actions, route handlers) calls services; services call Supabase. This is the seam where a future LLM tool-calling layer (`Compass AI`) plugs in — it calls the *same* services, so it automatically inherits RLS/RBAC and can never see data the calling user can't.
- **Authorization in two layers:** Postgres Row Level Security (data-layer, cannot be bypassed) + application-level RBAC/object permission checks (UX-layer, for good error messages and hiding UI). RLS is the source of truth.
- **Progress roll-up and health scoring** run as Postgres functions/triggers (not app-layer cron) so they're always consistent regardless of write path.
- Validation with `zod` shared between client forms and server actions.

## B. Database ER Model (textual)

```
organizations 1─* profiles (users)
profiles *─* roles (via user_roles)
roles *─* permissions (via role_permissions)

organizations 1─* departments
organizations 1─* business_verticals
business_verticals 1─* strategic_goals
business_verticals 1─* initiatives

strategic_goals *─* initiatives (via goal_initiatives, many-to-many contribution)

initiatives 1─* milestones
initiatives 1─* initiative_members (accountable_owner/sponsor/manager/contributor roles)
initiatives 1─* initiative_updates (check-ins)
initiatives 1─* health_scores (history)

milestones 1─* tasks
tasks 1─* tasks (self-referencing: parent_task_id -> subtasks, unlimited depth, cycle-guarded)
tasks *─* tasks (task_dependencies, "blocks/blocked_by", cycle-guarded)

tasks 1─* task_assignments (current responsible / accountable / assigned_by / contributors)
tasks 1─* task_delegations (chain: delegated_by, delegated_to, parent delegation)
tasks 1─* task_updates
tasks 1─* status_history
tasks 1─* due_date_history
tasks 1─* approvals

initiatives / milestones / tasks 1─* issues
initiatives / milestones / tasks 1─* risks
initiatives / tasks 1─* escalations
initiatives / milestones / tasks / issues / risks / decisions 1─* comments
initiatives / milestones / tasks / decisions / meetings 1─* documents

meetings 1─* meeting_attendees
meetings 1─* meeting_items (agenda items: commitments, since-last-meeting, health review, decisions, new initiatives/actions)
meetings 1─* decisions (decisions can also stand alone, linked to initiative)

profiles 1─* notifications
every mutating table 1─* audit_logs (polymorphic: entity_type + entity_id)
```

Cross-cutting: every strategic/execution entity carries `visibility` (operational | management_visible | leadership_attention) and `confidentiality` (normal | restricted | leadership_confidential), plus `created_by`, `created_at`, `updated_at`, `deleted_at` (soft delete).

## C. Role & Permission Matrix

Roles are seeded but **not hard-coded into logic** — access is RBAC (role → permissions) **plus** object-level grants via `initiative_members` / `task_assignments` (e.g. a Level-6 employee can be `accountable_owner` on one initiative). Effective permission = role permission OR object-level relationship.

| Role | Command Center | Create Initiative | Own Initiative (any) | Delegate | View Confidential | Approve | Admin |
|---|---|---|---|---|---|---|---|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MD/CEO | ✅ | ✅ | ✅ (all) | ✅ | ✅ | ✅ | Org settings |
| Director | ✅ (scoped) | ✅ | ✅ (own verticals) | ✅ | ✅ (own scope) | ✅ | — |
| Business Head | ✅ (vertical) | ✅ (own vertical) | ✅ (own vertical) | ✅ | Own vertical only | ✅ | — |
| Manager | Team view only | Task-level | Object-level only | ✅ | If granted | ✅ (team) | — |
| Team Lead | Team view only | Task/subtask | Object-level only | ✅ | If granted | Sub-level | — |
| Employee | My Work only | Subtask only | Object-level only | ❌ | If granted | ❌ | — |
| Viewer | Read-only, no confidential | ❌ | ❌ | ❌ | ❌ | ❌ | — |

Enforced via Postgres RLS policies keyed off `auth.uid()` → `profiles` → `user_roles` → `role_permissions`, plus explicit `EXISTS` checks against `initiative_members`/`task_assignments` for object-level grants and `visibility`/`confidentiality` columns.

## D. Leadership Portal Sitemap (`/leadership/...`)
`command-center` · `goals` · `verticals` · `verticals/[id]` · `initiatives` · `initiatives/[id]` (tabs: overview, milestones, tasks, updates, issues, risks, decisions, documents, comments, activity) · `strategy-review` (weekly meeting) · `strategy-review/[meetingId]` · `decisions` · `issues-risks` · `escalations` · `roadmap` · `reports` · `search` · `admin` (org, users, roles, verticals, config)

## E. Team Portal Sitemap (`/team/...`)
`my-work` · `my-team` (managers+) · `tasks` (list/kanban/calendar/timeline) · `tasks/[id]` · `delegated` · `approvals` · `blockers` · `calendar` · `notifications` · `search`

## F. Core User Journeys
1. **MVP end-to-end** (spec §52): MD creates initiative → assigns Director as accountable owner → Director creates milestone → delegates to PM → PM (Team portal) creates tasks → assigns to employees → employees update progress → roll-up: task → milestone → initiative → MD sees updated health in Command Center → employee raises blocker → manager escalates to leadership → MD sees escalation → records decision → decision spawns follow-up task → next Strategy Review shows what changed & commitment status.
2. **Delegation chain preserved**: accountable_owner never changes on delegation; only `responsible` moves down task_delegations chain; audit_log + delegation tree visualize full chain.
3. **Weekly review loop**: system diffs current DB state vs. last meeting's snapshot to auto-build agenda (§30 "Since Last Meeting" engine).

## G. Database Schema
Implemented as SQL migrations in `supabase/migrations/`. See `0001_init.sql` (core hierarchy + RBAC), `0002_execution.sql` (tasks/delegation/updates), `0003_governance.sql` (meetings/decisions/issues/risks/escalations), `0004_collab.sql` (comments/documents/notifications/audit), `0005_rls.sql` (policies), `0006_functions.sql` (roll-up + health score), `0007_seed.sql` (demo data).

## H. MVP Scope (Phase 1, this build)
Auth, organizations, profiles, roles/permissions, business verticals, strategic goals, initiatives, milestones, tasks, subtasks, task dependencies, assignment, delegation (with chain + tree UI), status/due-date/audit history, Command Center (real KPI cards from DB), Initiative detail (overview/milestones/tasks/updates/activity tabs), Team portal My Work + task views, automatic progress roll-up, initiative health score calculation, demo seed data. Issues/Risks/Decisions/Escalations/Meetings get minimal data model + basic UI now (per spec §9-24 they're core, not "future"), full Strategy Review workspace and AI features follow in later passes.

## I. Folder Architecture
```
src/
  app/
    (leadership)/leadership/...        # leadership route group
    (team)/team/...                    # team route group
    auth/...                           # login, callback
    api/...                            # route handlers where server actions don't fit
  components/
    ui/                                # shadcn primitives
    leadership/  team/  shared/        # domain components
  server/
    services/                          # initiatives.ts, tasks.ts, delegation.ts, health.ts, meetings.ts, ...
    actions/                           # 'use server' actions calling services
    auth/                              # session, rbac helpers
  lib/
    supabase/                          # server.ts, client.ts, middleware.ts
    validation/                        # zod schemas
    utils/
  types/                               # generated Supabase types + domain types
supabase/
  migrations/
  seed.sql
```

## J. Implementation Sequence
1. Dependencies + shadcn/ui + Supabase clients.
2. SQL migrations (schema, RLS, functions) — pushed to your Supabase cloud project.
3. Auth (Supabase Auth, email/password), profile bootstrap, RBAC helpers.
4. Service layer + server actions for core hierarchy CRUD.
5. Leadership: Command Center, Verticals, Initiatives (list + detail), Goals.
6. Team: My Work, Task list/kanban, task detail, delegation UI.
7. Progress roll-up + health score functions, wired into dashboards.
8. Audit trail, notifications (in-app), issues/risks/decisions/escalations minimal flows.
9. Seed script with realistic demo data (verticals, initiatives, users, tasks — green/amber/red mix).
10. Later passes: full Strategy Review meeting workspace, roadmap, reports, AI service-layer hooks.
