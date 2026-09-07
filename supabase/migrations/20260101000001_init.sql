-- iSN Compass: 0001 — Simplified single-admin schema
-- Departments, team-member directory, initiatives, tasks, activity log.
-- One Admin (Supabase Auth user) manages everything; team members never log in.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================
-- ENUMS
-- ============================================================
create type initiative_status as enum ('not_started', 'active', 'on_hold', 'completed');
create type task_priority as enum ('low', 'medium', 'high');
create type task_status as enum ('not_started', 'in_progress', 'completion_confirmed', 'completed');

-- ============================================================
-- DEPARTMENTS / VERTICALS
-- ============================================================
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEAM MEMBER DIRECTORY (not auth.users — directory only, no login)
-- ============================================================
create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null unique,
  department_id uuid references departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_team_members_department on team_members(department_id);

-- ============================================================
-- INITIATIVES
-- ============================================================
create table initiatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id uuid not null references departments(id),
  description text,
  start_date date,
  target_date date,
  status initiative_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_initiatives_department on initiatives(department_id);
create index idx_initiatives_status on initiatives(status);

-- ============================================================
-- TASKS
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  name text not null,
  description text,
  assigned_to uuid references team_members(id),
  priority task_priority not null default 'medium',
  start_date date,
  due_date date,
  status task_status not null default 'not_started',
  -- Regenerated on (re)assignment/reopen so a stale email link can't confirm a different run.
  confirmation_token uuid not null default gen_random_uuid(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_initiative on tasks(initiative_id);
create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_tasks_status on tasks(status);
create index idx_tasks_due_date on tasks(due_date);
create unique index idx_tasks_confirmation_token on tasks(confirmation_token);

-- ============================================================
-- ACTIVITY LOG (append-only)
-- ============================================================
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'initiative' | 'task'
  entity_id uuid not null,
  action text not null, -- 'initiative_created','task_created','task_assigned','task_reassigned','task_status_changed','completion_confirmation_received','task_marked_completed','task_reopened', ...
  actor text not null default 'Admin', -- 'Admin' or the team member's name (email confirmations)
  description text not null,
  created_at timestamptz not null default now()
);
create index idx_activity_log_entity on activity_log(entity_type, entity_id);
create index idx_activity_log_created on activity_log(created_at desc);

create or replace function forbid_activity_log_mutation() returns trigger as $$
begin
  raise exception 'activity_log is append-only';
end;
$$ language plpgsql;
create trigger trg_forbid_activity_log_update before update on activity_log for each row execute function forbid_activity_log_mutation();
create trigger trg_forbid_activity_log_delete before delete on activity_log for each row execute function forbid_activity_log_mutation();

-- ============================================================
-- updated_at TRIGGERS
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_departments_updated_at before update on departments for each row execute function set_updated_at();
create trigger trg_team_members_updated_at before update on team_members for each row execute function set_updated_at();
create trigger trg_initiatives_updated_at before update on initiatives for each row execute function set_updated_at();
create trigger trg_tasks_updated_at before update on tasks for each row execute function set_updated_at();

-- ============================================================
-- RLS — single Admin user, so "authenticated" == "the Admin".
-- Public confirm-completion link and the cron reminder job bypass RLS
-- deliberately via the service-role client (src/lib/supabase/admin.ts).
-- ============================================================
alter table departments enable row level security;
alter table team_members enable row level security;
alter table initiatives enable row level security;
alter table tasks enable row level security;
alter table activity_log enable row level security;

create policy "authenticated full access" on departments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on team_members for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on initiatives for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on tasks for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read" on activity_log for select
  using (auth.role() = 'authenticated');
create policy "authenticated insert" on activity_log for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- ADMIN HELPERS (service_role only — demo reset)
-- ============================================================
create or replace function admin_set_activity_log_delete_enabled(p_enabled boolean) returns void
language plpgsql security definer as $$
begin
  if p_enabled then
    execute 'alter table activity_log enable trigger trg_forbid_activity_log_delete';
  else
    execute 'alter table activity_log disable trigger trg_forbid_activity_log_delete';
  end if;
end;
$$;
revoke all on function admin_set_activity_log_delete_enabled(boolean) from public;
grant execute on function admin_set_activity_log_delete_enabled(boolean) to service_role;

create or replace function admin_wipe_data() returns void
language plpgsql security definer as $$
begin
  delete from tasks;
  delete from initiatives;
  delete from team_members;
  delete from departments;
end;
$$;
revoke all on function admin_wipe_data() from public;
grant execute on function admin_wipe_data() to service_role;
