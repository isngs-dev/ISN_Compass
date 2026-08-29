-- iSN Compass: 0004 — Comments, documents, notifications, audit trail

create type document_category as enum ('scope','brd','proposal','contract','presentation','report','meeting_notes','client_communication','other');
create type notification_type as enum (
  'task_assigned','task_delegated','task_due_soon','task_overdue','task_blocked',
  'approval_requested','approval_completed','comment_mention','initiative_health_changed',
  'milestone_delayed','escalation_raised','decision_required'
);

-- ============================================================
-- COMMENTS (polymorphic)
-- ============================================================
create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null, -- 'initiative' | 'milestone' | 'task' | 'issue' | 'risk' | 'decision'
  entity_id uuid not null,
  author_id uuid not null references profiles(id),
  body text not null,
  parent_comment_id uuid references comments(id) on delete cascade,
  mentioned_user_ids uuid[] not null default '{}',
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_comments_entity on comments(entity_type, entity_id);
create index idx_comments_author on comments(author_id);

-- ============================================================
-- DOCUMENTS (polymorphic; Supabase Storage object path or external link)
-- ============================================================
create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null, -- 'initiative' | 'milestone' | 'task' | 'decision' | 'meeting'
  entity_id uuid not null,
  name text not null,
  category document_category not null default 'other',
  storage_path text, -- supabase storage object path
  external_url text, -- future: Google Drive / OneDrive link
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_documents_entity on documents(entity_type, entity_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, is_read);

-- ============================================================
-- AUDIT LOGS (append-only; never editable by app users)
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null, -- 'created','updated','status_changed','delegated','assigned','approved','escalated','health_overridden', etc.
  actor_id uuid references profiles(id),
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_org on audit_logs(organization_id, created_at desc);

-- Audit logs are append-only: block UPDATE/DELETE outright (enforced beyond RLS)
create or replace function forbid_audit_mutation() returns trigger as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$ language plpgsql;
create trigger trg_forbid_audit_update before update on audit_logs for each row execute function forbid_audit_mutation();
create trigger trg_forbid_audit_delete before delete on audit_logs for each row execute function forbid_audit_mutation();
