-- iSN Compass: 0002 — Tasks, assignment, delegation, execution tracking

create type task_status as enum ('not_started','in_progress','blocked','completed','deferred','cancelled');
create type assignment_role as enum ('accountable_owner','responsible','contributor');
create type approval_status as enum ('pending','approved','rejected','changes_requested');
create type confidence_level as enum ('high','medium','low');
create type dependency_type as enum ('blocks','related');

-- ============================================================
-- TASKS (also represents "strategic task" when parent_task_id is null
-- and linked directly to a milestone; subtasks via parent_task_id)
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  depth int not null default 0, -- guarded, capped at 5 in trigger below
  weight numeric(5,2) not null default 0 check (weight between 0 and 100), -- contribution to parent progress
  assignment_date timestamptz,
  start_date date,
  due_date date,
  original_due_date date,
  completion_date date,
  priority priority_level not null default 'p3_normal',
  status task_status not null default 'not_started',
  percentage_complete numeric(5,2) not null default 0 check (percentage_complete between 0 and 100),
  visibility visibility_level not null default 'operational',
  confidentiality confidentiality_level not null default 'normal',
  approval_required boolean not null default false,
  approval_status approval_status,
  escalation_status text, -- null | 'raised' | 'escalated' | 'resolved'
  extension_count int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);
create index idx_tasks_org on tasks(organization_id);
create index idx_tasks_initiative on tasks(initiative_id);
create index idx_tasks_milestone on tasks(milestone_id);
create index idx_tasks_parent on tasks(parent_task_id);
create index idx_tasks_status on tasks(status);
create index idx_tasks_due on tasks(due_date);
create trigger trg_tasks_updated_at before update on tasks for each row execute function set_updated_at();

-- prevent unmanageable depth (Initiative > Milestone > Task > Subtask > Action = depth 3 max under a task)
create or replace function check_task_depth() returns trigger as $$
declare
  parent_depth int;
begin
  if new.parent_task_id is not null then
    select depth into parent_depth from tasks where id = new.parent_task_id;
    if parent_depth is null then
      raise exception 'Parent task not found';
    end if;
    if parent_depth >= 4 then
      raise exception 'Maximum subtask nesting depth reached (5 levels)';
    end if;
    new.depth := parent_depth + 1;
  else
    new.depth := 0;
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_check_task_depth before insert or update of parent_task_id on tasks for each row execute function check_task_depth();

-- ============================================================
-- TASK ASSIGNMENTS (current state: who is accountable/responsible/contributing)
-- ============================================================
create table task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id),
  assignment_role assignment_role not null,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (task_id, user_id, assignment_role)
);
create index idx_task_assignments_task on task_assignments(task_id);
create index idx_task_assignments_user on task_assignments(user_id);

-- ============================================================
-- TASK DELEGATIONS (execution moves down, accountability chain preserved)
-- ============================================================
create table task_delegations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  parent_delegation_id uuid references task_delegations(id),
  delegated_by uuid not null references profiles(id),
  delegated_to uuid not null references profiles(id),
  delegated_at timestamptz not null default now(),
  original_due_date date,
  delegated_due_date date,
  instructions text,
  status task_status not null default 'not_started',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (delegated_by <> delegated_to)
);
create index idx_delegations_task on task_delegations(task_id);
create index idx_delegations_to on task_delegations(delegated_to);
create index idx_delegations_by on task_delegations(delegated_by);

-- ============================================================
-- TASK DEPENDENCIES (cycle-guarded)
-- ============================================================
create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  dependency_type dependency_type not null default 'blocks',
  created_at timestamptz not null default now(),
  check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id)
);

create or replace function check_dependency_cycle() returns trigger as $$
declare
  found_cycle boolean;
begin
  with recursive chain as (
    select new.task_id as start_id, new.depends_on_task_id as current_id
    union all
    select chain.start_id, td.depends_on_task_id
    from task_dependencies td
    join chain on td.task_id = chain.current_id
  )
  select exists(select 1 from chain where current_id = start_id) into found_cycle;
  if found_cycle then
    raise exception 'Circular task dependency detected';
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_check_dependency_cycle before insert on task_dependencies for each row execute function check_dependency_cycle();

-- ============================================================
-- UPDATES (task-level and initiative-level check-ins)
-- ============================================================
create table task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references profiles(id),
  note text not null,
  percentage_complete numeric(5,2) check (percentage_complete between 0 and 100),
  status_at_update task_status,
  created_at timestamptz not null default now()
);
create index idx_task_updates_task on task_updates(task_id);

create table initiative_updates (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  author_id uuid not null references profiles(id),
  completed_summary text,
  in_progress_summary text,
  next_steps text,
  blockers text,
  needs_management_support boolean not null default false,
  confidence confidence_level not null default 'medium',
  created_at timestamptz not null default now()
);
create index idx_initiative_updates_initiative on initiative_updates(initiative_id);

-- ============================================================
-- STATUS / DUE-DATE HISTORY (change control, immutable)
-- ============================================================
create table status_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'task' | 'milestone' | 'initiative'
  entity_id uuid not null,
  previous_status text,
  new_status text not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  reason text
);
create index idx_status_history_entity on status_history(entity_type, entity_id);

create table due_date_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  original_due_date date,
  new_due_date date not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  reason text not null
);
create index idx_due_date_history_task on due_date_history(task_id);

-- ============================================================
-- APPROVALS
-- ============================================================
create table approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'task' | 'milestone'
  entity_id uuid not null,
  requested_by uuid not null references profiles(id),
  approver_id uuid not null references profiles(id),
  status approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  comment text
);
create index idx_approvals_entity on approvals(entity_type, entity_id);
create index idx_approvals_approver on approvals(approver_id);

-- ============================================================
-- HEALTH SCORES (history of computed/overridden scores)
-- ============================================================
create table health_scores (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  score numeric(5,2) not null,
  health health_status not null,
  milestone_progress_component numeric(5,2),
  on_time_completion_component numeric(5,2),
  overdue_impact_component numeric(5,2),
  open_blockers_component numeric(5,2),
  update_freshness_component numeric(5,2),
  is_override boolean not null default false,
  override_reason text,
  computed_at timestamptz not null default now(),
  computed_by uuid references profiles(id)
);
create index idx_health_scores_initiative on health_scores(initiative_id);
