-- iSN Compass: 0001 — Core hierarchy, organizations, RBAC
-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================
-- ENUMS
-- ============================================================
create type org_level as enum ('l1_md_ceo','l2_director','l3_business_head','l4_manager','l5_team_lead','l6_employee');
create type role_key as enum ('super_admin','md_ceo','director','business_head','manager','team_lead','employee','viewer');
create type visibility_level as enum ('operational','management_visible','leadership_attention');
create type confidentiality_level as enum ('normal','restricted','leadership_confidential');
create type health_status as enum ('green','amber','red','grey','blue');
create type initiative_status as enum ('planning','active','on_hold','completed','cancelled');
create type initiative_category as enum ('revenue_growth','new_product','business_development','client_delivery','technology','automation','cost_reduction','operational_improvement','compliance','hr','strategic_partnership');
create type priority_level as enum ('p1_critical','p2_high','p3_normal','p4_low');
create type member_role as enum ('executive_sponsor','accountable_owner','responsible_manager','contributor');
create type goal_status as enum ('on_track','at_risk','off_track','completed');

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  no_update_threshold_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  parent_department_id uuid references departments(id),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email citext not null,
  title text,
  org_level org_level not null default 'l6_employee',
  department_id uuid references departments(id),
  manager_id uuid references profiles(id),
  avatar_url text,
  is_active boolean not null default true,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);
create index idx_profiles_org on profiles(organization_id);
create index idx_profiles_manager on profiles(manager_id);

-- ============================================================
-- RBAC
-- ============================================================
create table roles (
  id uuid primary key default gen_random_uuid(),
  key role_key not null unique,
  name text not null,
  description text,
  rank int not null -- lower = more senior, used for escalation routing
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- e.g. 'initiative.create', 'initiative.view_confidential'
  description text
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  granted_by uuid references profiles(id),
  granted_at timestamptz not null default now(),
  unique (user_id, role_id)
);
create index idx_user_roles_user on user_roles(user_id);

-- ============================================================
-- BUSINESS VERTICALS
-- ============================================================
create table business_verticals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  vertical_head_id uuid references profiles(id),
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, name)
);
create index idx_verticals_org on business_verticals(organization_id);

-- ============================================================
-- STRATEGIC GOALS
-- ============================================================
create table strategic_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  period text not null, -- e.g. 'FY2026', 'Q3-2026'
  owner_id uuid references profiles(id),
  target text,
  status goal_status not null default 'on_track',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  business_vertical_id uuid references business_verticals(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_goals_org on strategic_goals(organization_id);
create index idx_goals_vertical on strategic_goals(business_vertical_id);

-- ============================================================
-- INITIATIVES
-- ============================================================
create table initiatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null, -- human-friendly Initiative ID e.g. INIT-0042
  name text not null,
  description text,
  business_vertical_id uuid not null references business_verticals(id),
  strategic_goal_id uuid references strategic_goals(id),
  category initiative_category not null default 'operational_improvement',
  strategic_objective text,
  priority priority_level not null default 'p3_normal',
  start_date date,
  target_completion_date date,
  actual_completion_date date,
  percentage_complete numeric(5,2) not null default 0 check (percentage_complete between 0 and 100),
  health health_status not null default 'grey',
  health_score numeric(5,2) not null default 0 check (health_score between 0 and 100),
  health_overridden boolean not null default false,
  health_override_reason text,
  health_overridden_by uuid references profiles(id),
  health_overridden_at timestamptz,
  status initiative_status not null default 'planning',
  budget numeric(14,2),
  revenue_opportunity numeric(14,2),
  cost_saving_opportunity numeric(14,2),
  tags text[] not null default '{}',
  visibility visibility_level not null default 'management_visible',
  confidentiality confidentiality_level not null default 'normal',
  last_update_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);
create index idx_initiatives_org on initiatives(organization_id);
create index idx_initiatives_vertical on initiatives(business_vertical_id);
create index idx_initiatives_status on initiatives(status);
create index idx_initiatives_health on initiatives(health);
create index idx_initiatives_goal on initiatives(strategic_goal_id);

create table goal_initiatives (
  goal_id uuid not null references strategic_goals(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  contribution_weight numeric(5,2) not null default 100 check (contribution_weight between 0 and 100),
  primary key (goal_id, initiative_id)
);

-- ============================================================
-- INITIATIVE MEMBERS (accountability chain roots)
-- ============================================================
create table initiative_members (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  user_id uuid not null references profiles(id),
  member_role member_role not null,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  unique (initiative_id, user_id, member_role)
);
create index idx_init_members_initiative on initiative_members(initiative_id);
create index idx_init_members_user on initiative_members(user_id);

-- ============================================================
-- MILESTONES
-- ============================================================
create table milestones (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid references profiles(id),
  due_date date,
  status initiative_status not null default 'planning',
  weight numeric(5,2) not null default 0 check (weight between 0 and 100), -- % contribution to initiative progress
  completion_percentage numeric(5,2) not null default 0 check (completion_percentage between 0 and 100),
  priority priority_level not null default 'p3_normal',
  approval_required boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_milestones_initiative on milestones(initiative_id);

create table milestone_dependencies (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id) on delete cascade,
  depends_on_milestone_id uuid not null references milestones(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (milestone_id <> depends_on_milestone_id),
  unique (milestone_id, depends_on_milestone_id)
);

-- updated_at trigger helper (reused by later migrations)
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated_at before update on organizations for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger trg_verticals_updated_at before update on business_verticals for each row execute function set_updated_at();
create trigger trg_goals_updated_at before update on strategic_goals for each row execute function set_updated_at();
create trigger trg_initiatives_updated_at before update on initiatives for each row execute function set_updated_at();
create trigger trg_milestones_updated_at before update on milestones for each row execute function set_updated_at();
