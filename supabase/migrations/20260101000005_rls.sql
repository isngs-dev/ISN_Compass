-- iSN Compass: 0005 — RLS helper functions + policies
-- Authorization model: Postgres RLS is the source of truth (cannot be bypassed by the app).
-- App-level RBAC checks exist only for UX (hiding buttons, friendly errors).

-- ============================================================
-- HELPER FUNCTIONS (security definer, fixed search_path, read-only)
-- ============================================================
create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function current_org_level() returns org_level
language sql stable security definer set search_path = public as $$
  select org_level from profiles where id = auth.uid()
$$;

create or replace function has_role(keys role_key[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key = any(keys)
  )
$$;

create or replace function has_permission(perm_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.key = perm_key
  )
$$;

-- blanket leadership visibility: super admin / MD / director / business head
create or replace function is_leadership() returns boolean
language sql stable security definer set search_path = public as $$
  select has_role(array['super_admin','md_ceo','director','business_head']::role_key[])
$$;

create or replace function is_initiative_member(p_initiative_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from initiative_members im
    where im.initiative_id = p_initiative_id and im.user_id = auth.uid()
  )
$$;

create or replace function is_task_related(p_task_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from task_assignments ta where ta.task_id = p_task_id and ta.user_id = auth.uid()
  ) or exists (
    select 1 from task_delegations td where td.task_id = p_task_id
      and (td.delegated_to = auth.uid() or td.delegated_by = auth.uid())
  ) or exists (
    select 1 from tasks t where t.id = p_task_id and t.created_by = auth.uid()
  ) or exists (
    select 1 from tasks t where t.id = p_task_id and is_initiative_member(t.initiative_id)
  )
$$;

-- can this user see a confidential/restricted initiative?
create or replace function can_view_initiative(p_initiative_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when (select confidentiality from initiatives where id = p_initiative_id) = 'normal' then true
    when is_leadership() then true
    when is_initiative_member(p_initiative_id) then true
    when exists (
      select 1 from business_verticals bv join initiatives i on i.business_vertical_id = bv.id
      where i.id = p_initiative_id and bv.vertical_head_id = auth.uid()
    ) then true
    else false
  end
$$;

create or replace function can_manage_initiative(p_initiative_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select has_permission('initiative.manage')
    or exists (
      select 1 from initiative_members im
      where im.initiative_id = p_initiative_id and im.user_id = auth.uid()
        and im.member_role in ('accountable_owner','responsible_manager','executive_sponsor')
    )
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table organizations enable row level security;
alter table departments enable row level security;
alter table profiles enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;
alter table business_verticals enable row level security;
alter table strategic_goals enable row level security;
alter table goal_initiatives enable row level security;
alter table initiatives enable row level security;
alter table initiative_members enable row level security;
alter table milestones enable row level security;
alter table milestone_dependencies enable row level security;
alter table tasks enable row level security;
alter table task_assignments enable row level security;
alter table task_delegations enable row level security;
alter table task_dependencies enable row level security;
alter table task_updates enable row level security;
alter table initiative_updates enable row level security;
alter table status_history enable row level security;
alter table due_date_history enable row level security;
alter table approvals enable row level security;
alter table health_scores enable row level security;
alter table issues enable row level security;
alter table risks enable row level security;
alter table meetings enable row level security;
alter table meeting_attendees enable row level security;
alter table meeting_items enable row level security;
alter table decisions enable row level security;
alter table escalations enable row level security;
alter table comments enable row level security;
alter table documents enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- ============================================================
-- ORG / PEOPLE / RBAC TABLES
-- ============================================================
create policy org_select on organizations for select using (id = current_org_id());
create policy dept_select on departments for select using (organization_id = current_org_id());
create policy dept_write on departments for all using (organization_id = current_org_id() and has_permission('admin.manage')) with check (organization_id = current_org_id() and has_permission('admin.manage'));

create policy profiles_select on profiles for select using (organization_id = current_org_id());
create policy profiles_update_self on profiles for update using (id = auth.uid() or has_permission('admin.manage')) with check (id = auth.uid() or has_permission('admin.manage'));
create policy profiles_insert_self on profiles for insert with check (id = auth.uid());

create policy roles_select on roles for select using (true);
create policy permissions_select on permissions for select using (true);
create policy role_permissions_select on role_permissions for select using (true);

create policy user_roles_select on user_roles for select using (organization_id = current_org_id());
create policy user_roles_write on user_roles for all using (organization_id = current_org_id() and has_permission('admin.manage')) with check (organization_id = current_org_id() and has_permission('admin.manage'));

-- ============================================================
-- VERTICALS / GOALS
-- ============================================================
create policy verticals_select on business_verticals for select using (organization_id = current_org_id() and deleted_at is null);
create policy verticals_write on business_verticals for all using (organization_id = current_org_id() and has_permission('vertical.manage')) with check (organization_id = current_org_id() and has_permission('vertical.manage'));

create policy goals_select on strategic_goals for select using (organization_id = current_org_id() and deleted_at is null);
create policy goals_write on strategic_goals for all using (organization_id = current_org_id() and has_permission('goal.manage')) with check (organization_id = current_org_id() and has_permission('goal.manage'));

create policy goal_initiatives_select on goal_initiatives for select using (
  exists (select 1 from strategic_goals g where g.id = goal_id and g.organization_id = current_org_id())
);
create policy goal_initiatives_write on goal_initiatives for all using (has_permission('goal.manage')) with check (has_permission('goal.manage'));

-- ============================================================
-- INITIATIVES
-- ============================================================
create policy initiatives_select on initiatives for select using (
  organization_id = current_org_id() and deleted_at is null and can_view_initiative(id)
);
create policy initiatives_insert on initiatives for insert with check (
  organization_id = current_org_id() and has_permission('initiative.create')
);
create policy initiatives_update on initiatives for update using (
  organization_id = current_org_id() and can_manage_initiative(id)
) with check (
  organization_id = current_org_id() and can_manage_initiative(id)
);
create policy initiatives_delete on initiatives for delete using (
  organization_id = current_org_id() and has_permission('admin.manage')
);

create policy initiative_members_select on initiative_members for select using (
  exists (select 1 from initiatives i where i.id = initiative_id and can_view_initiative(i.id))
);
create policy initiative_members_write on initiative_members for all using (
  exists (select 1 from initiatives i where i.id = initiative_id and can_manage_initiative(i.id))
) with check (
  exists (select 1 from initiatives i where i.id = initiative_id and can_manage_initiative(i.id))
);

-- ============================================================
-- MILESTONES
-- ============================================================
create policy milestones_select on milestones for select using (
  deleted_at is null and exists (select 1 from initiatives i where i.id = initiative_id and can_view_initiative(i.id))
);
create policy milestones_write on milestones for all using (
  exists (select 1 from initiatives i where i.id = initiative_id and can_manage_initiative(i.id))
) with check (
  exists (select 1 from initiatives i where i.id = initiative_id and can_manage_initiative(i.id))
);

create policy milestone_deps_select on milestone_dependencies for select using (
  exists (select 1 from milestones m join initiatives i on i.id = m.initiative_id where m.id = milestone_id and can_view_initiative(i.id))
);
create policy milestone_deps_write on milestone_dependencies for all using (
  exists (select 1 from milestones m join initiatives i on i.id = m.initiative_id where m.id = milestone_id and can_manage_initiative(i.id))
) with check (
  exists (select 1 from milestones m join initiatives i on i.id = m.initiative_id where m.id = milestone_id and can_manage_initiative(i.id))
);

-- ============================================================
-- TASKS
-- ============================================================
create policy tasks_select on tasks for select using (
  organization_id = current_org_id() and deleted_at is null
  and (can_view_initiative(initiative_id) or is_task_related(id))
);
create policy tasks_insert on tasks for insert with check (
  organization_id = current_org_id()
  and (can_manage_initiative(initiative_id) or has_permission('task.manage_any')
       or (parent_task_id is not null and is_task_related(parent_task_id)))
);
create policy tasks_update on tasks for update using (
  organization_id = current_org_id()
  and (can_manage_initiative(initiative_id) or has_permission('task.manage_any') or is_task_related(id))
) with check (
  organization_id = current_org_id()
);
create policy tasks_delete on tasks for delete using (
  organization_id = current_org_id() and (can_manage_initiative(initiative_id) or has_permission('admin.manage'))
);

create policy task_assignments_select on task_assignments for select using (is_task_related(task_id));
create policy task_assignments_write on task_assignments for all using (
  is_task_related(task_id) or exists (select 1 from tasks t where t.id = task_id and can_manage_initiative(t.initiative_id))
) with check (
  is_task_related(task_id) or exists (select 1 from tasks t where t.id = task_id and can_manage_initiative(t.initiative_id))
);

create policy task_delegations_select on task_delegations for select using (is_task_related(task_id));
create policy task_delegations_insert on task_delegations for insert with check (
  delegated_by = auth.uid() and is_task_related(task_id)
);
create policy task_delegations_update on task_delegations for update using (
  delegated_by = auth.uid() or delegated_to = auth.uid()
);

create policy task_deps_select on task_dependencies for select using (is_task_related(task_id));
create policy task_deps_write on task_dependencies for all using (is_task_related(task_id)) with check (is_task_related(task_id));

create policy task_updates_select on task_updates for select using (is_task_related(task_id));
create policy task_updates_insert on task_updates for insert with check (author_id = auth.uid() and is_task_related(task_id));

create policy initiative_updates_select on initiative_updates for select using (
  exists (select 1 from initiatives i where i.id = initiative_id and can_view_initiative(i.id))
);
create policy initiative_updates_insert on initiative_updates for insert with check (
  author_id = auth.uid() and exists (select 1 from initiatives i where i.id = initiative_id and can_view_initiative(i.id))
);

create policy status_history_select on status_history for select using (true);
create policy status_history_insert on status_history for insert with check (changed_by = auth.uid());

create policy due_date_history_select on due_date_history for select using (is_task_related(task_id));
create policy due_date_history_insert on due_date_history for insert with check (changed_by = auth.uid() and is_task_related(task_id));

create policy approvals_select on approvals for select using (
  requested_by = auth.uid() or approver_id = auth.uid()
);
create policy approvals_insert on approvals for insert with check (requested_by = auth.uid());
create policy approvals_update on approvals for update using (approver_id = auth.uid());

create policy health_scores_select on health_scores for select using (
  exists (select 1 from initiatives i where i.id = initiative_id and can_view_initiative(i.id))
);
create policy health_scores_insert on health_scores for insert with check (
  exists (select 1 from initiatives i where i.id = initiative_id and can_manage_initiative(i.id))
);

-- ============================================================
-- ISSUES / RISKS / DECISIONS / MEETINGS / ESCALATIONS
-- ============================================================
create policy issues_select on issues for select using (
  organization_id = current_org_id()
  and (initiative_id is null or can_view_initiative(initiative_id))
);
create policy issues_write on issues for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

create policy risks_select on risks for select using (
  organization_id = current_org_id()
  and (initiative_id is null or can_view_initiative(initiative_id))
);
create policy risks_write on risks for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

create policy decisions_select on decisions for select using (organization_id = current_org_id());
create policy decisions_write on decisions for all using (
  organization_id = current_org_id() and has_permission('decision.manage')
) with check (organization_id = current_org_id() and has_permission('decision.manage'));

create policy meetings_select on meetings for select using (organization_id = current_org_id());
create policy meetings_write on meetings for all using (
  organization_id = current_org_id() and has_permission('meeting.manage')
) with check (organization_id = current_org_id() and has_permission('meeting.manage'));

create policy meeting_attendees_select on meeting_attendees for select using (
  exists (select 1 from meetings m where m.id = meeting_id and m.organization_id = current_org_id())
);
create policy meeting_attendees_write on meeting_attendees for all using (has_permission('meeting.manage')) with check (has_permission('meeting.manage'));

create policy meeting_items_select on meeting_items for select using (
  exists (select 1 from meetings m where m.id = meeting_id and m.organization_id = current_org_id())
);
create policy meeting_items_write on meeting_items for all using (has_permission('meeting.manage')) with check (has_permission('meeting.manage'));

create policy escalations_select on escalations for select using (
  organization_id = current_org_id()
  and (raised_by = auth.uid() or assigned_to = auth.uid() or is_leadership()
       or (initiative_id is not null and can_view_initiative(initiative_id)))
);
create policy escalations_insert on escalations for insert with check (
  organization_id = current_org_id() and raised_by = auth.uid()
);
create policy escalations_update on escalations for update using (
  organization_id = current_org_id() and (raised_by = auth.uid() or assigned_to = auth.uid() or is_leadership())
);

-- ============================================================
-- COMMENTS / DOCUMENTS / NOTIFICATIONS / AUDIT
-- ============================================================
create policy comments_select on comments for select using (organization_id = current_org_id() and deleted_at is null);
create policy comments_insert on comments for insert with check (organization_id = current_org_id() and author_id = auth.uid());
create policy comments_update on comments for update using (author_id = auth.uid());

create policy documents_select on documents for select using (organization_id = current_org_id());
create policy documents_insert on documents for insert with check (organization_id = current_org_id() and uploaded_by = auth.uid());
create policy documents_delete on documents for delete using (organization_id = current_org_id() and uploaded_by = auth.uid());

create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());

create policy audit_logs_select on audit_logs for select using (
  organization_id = current_org_id() and (is_leadership() or has_permission('admin.manage'))
);
-- audit_logs inserts are performed by the service layer using the authenticated user's context;
-- any authenticated org member action that writes audit rows is allowed to insert (append-only, no update/delete per triggers above)
create policy audit_logs_insert on audit_logs for insert with check (organization_id = current_org_id());
