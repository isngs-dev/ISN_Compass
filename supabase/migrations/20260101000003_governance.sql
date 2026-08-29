-- iSN Compass: 0003 — Issues, risks, decisions, meetings, escalations

create type issue_severity as enum ('low','medium','high','critical');
create type issue_status as enum ('open','in_progress','resolved','closed');
create type risk_probability as enum ('low','medium','high');
create type risk_impact as enum ('low','medium','high');
create type risk_status as enum ('open','mitigating','closed','materialized');
create type decision_status as enum ('proposed','approved','rejected','deferred','superseded');
create type escalation_category as enum ('technical','client','resource','financial','approval','dependency','compliance','other');
create type escalation_level as enum ('manager','department_head','leadership','critical_leadership');
create type escalation_status as enum ('open','acknowledged','resolved','closed');
create type meeting_status as enum ('scheduled','in_progress','completed','cancelled');
create type meeting_item_type as enum ('previous_commitment','since_last_change','health_review','upcoming_milestone','issue','decision_required','new_initiative','new_action_item','commitment');

-- ============================================================
-- ISSUES (have happened)
-- ============================================================
create table issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  initiative_id uuid references initiatives(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  owner_id uuid references profiles(id),
  severity issue_severity not null default 'medium',
  date_raised date not null default current_date,
  impact text,
  resolution text,
  status issue_status not null default 'open',
  escalation_level escalation_level,
  closed_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index idx_issues_initiative on issues(initiative_id);
create index idx_issues_status on issues(status);
create trigger trg_issues_updated_at before update on issues for each row execute function set_updated_at();

-- ============================================================
-- RISKS (may happen)
-- ============================================================
create table risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  description text not null,
  initiative_id uuid references initiatives(id) on delete cascade,
  probability risk_probability not null default 'medium',
  impact risk_impact not null default 'medium',
  risk_score int generated always as (
    (case probability when 'low' then 1 when 'medium' then 2 else 3 end) *
    (case impact when 'low' then 1 when 'medium' then 2 else 3 end)
  ) stored,
  owner_id uuid references profiles(id),
  mitigation text,
  contingency text,
  review_date date,
  status risk_status not null default 'open',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index idx_risks_initiative on risks(initiative_id);
create index idx_risks_status on risks(status);
create trigger trg_risks_updated_at before update on risks for each row execute function set_updated_at();

-- ============================================================
-- MEETINGS (Weekly Strategy Review)
-- ============================================================
create table meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null default 'Weekly Strategy Review',
  meeting_date date not null default current_date,
  start_time timestamptz,
  end_time timestamptz,
  status meeting_status not null default 'scheduled',
  notes text,
  summary text,
  snapshot jsonb, -- state snapshot at meeting time, used by "since last meeting" engine
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_meetings_org on meetings(organization_id);
create index idx_meetings_date on meetings(meeting_date desc);
create trigger trg_meetings_updated_at before update on meetings for each row execute function set_updated_at();

create table meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id),
  attended boolean not null default true,
  unique (meeting_id, user_id)
);

create table meeting_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  item_type meeting_item_type not null,
  initiative_id uuid references initiatives(id),
  task_id uuid references tasks(id),
  title text not null,
  detail text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_meeting_items_meeting on meeting_items(meeting_id);

-- ============================================================
-- DECISION REGISTER
-- ============================================================
create table decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  decision_date date not null default current_date,
  decided_by uuid references profiles(id),
  initiative_id uuid references initiatives(id),
  meeting_id uuid references meetings(id),
  rationale text,
  status decision_status not null default 'proposed',
  review_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index idx_decisions_initiative on decisions(initiative_id);
create index idx_decisions_meeting on decisions(meeting_id);
create index idx_decisions_status on decisions(status);
create trigger trg_decisions_updated_at before update on decisions for each row execute function set_updated_at();

-- link a decision to a follow-up task it created (spec: "decision creates follow-up task")
alter table tasks add column source_decision_id uuid references decisions(id);

-- ============================================================
-- ESCALATIONS
-- ============================================================
create table escalations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  initiative_id uuid references initiatives(id),
  task_id uuid references tasks(id),
  category escalation_category not null default 'other',
  level escalation_level not null default 'manager',
  status escalation_status not null default 'open',
  raised_by uuid not null references profiles(id),
  assigned_to uuid references profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index idx_escalations_initiative on escalations(initiative_id);
create index idx_escalations_level on escalations(level);
create index idx_escalations_status on escalations(status);
create trigger trg_escalations_updated_at before update on escalations for each row execute function set_updated_at();
