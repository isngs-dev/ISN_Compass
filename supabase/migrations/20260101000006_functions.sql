-- iSN Compass: 0006 — Progress roll-up, health score, audit logging, data integrity

-- ============================================================
-- PROGRESS ROLL-UP (bottom-up: define leaf-most functions first)
-- ============================================================
create or replace function recalc_initiative_progress(p_initiative_id uuid) returns void
language plpgsql as $$
declare
  v_weight_total numeric;
  v_avg numeric;
begin
  select coalesce(sum(weight),0) into v_weight_total
  from milestones where initiative_id = p_initiative_id and deleted_at is null;

  if v_weight_total > 0 then
    select sum(completion_percentage * weight) / sum(weight) into v_avg
    from milestones where initiative_id = p_initiative_id and deleted_at is null and weight > 0;
  else
    select avg(completion_percentage) into v_avg
    from milestones where initiative_id = p_initiative_id and deleted_at is null;
  end if;

  update initiatives
    set percentage_complete = round(coalesce(v_avg, percentage_complete, 0), 2)
    where id = p_initiative_id;

  perform recalc_health_score(p_initiative_id);
end;
$$;

create or replace function recalc_milestone_progress(p_milestone_id uuid) returns void
language plpgsql as $$
declare
  v_weight_total numeric;
  v_avg numeric;
  v_initiative_id uuid;
begin
  select coalesce(sum(weight),0) into v_weight_total
  from tasks where milestone_id = p_milestone_id and parent_task_id is null and deleted_at is null;

  if v_weight_total > 0 then
    select sum(percentage_complete * weight) / sum(weight) into v_avg
    from tasks where milestone_id = p_milestone_id and parent_task_id is null and deleted_at is null and weight > 0;
  else
    select avg(percentage_complete) into v_avg
    from tasks where milestone_id = p_milestone_id and parent_task_id is null and deleted_at is null;
  end if;

  update milestones
    set completion_percentage = round(coalesce(v_avg, completion_percentage, 0), 2)
    where id = p_milestone_id
    returning initiative_id into v_initiative_id;

  if v_initiative_id is not null then
    perform recalc_initiative_progress(v_initiative_id);
  end if;
end;
$$;

create or replace function recalc_task_subtree(p_task_id uuid) returns void
language plpgsql as $$
declare
  v_weight_total numeric;
  v_avg numeric;
  v_child_count int;
  v_parent uuid;
  v_milestone uuid;
begin
  select count(*), coalesce(sum(weight),0) into v_child_count, v_weight_total
  from tasks where parent_task_id = p_task_id and deleted_at is null;

  if v_child_count > 0 then
    if v_weight_total > 0 then
      select sum(percentage_complete * weight) / sum(weight) into v_avg
      from tasks where parent_task_id = p_task_id and deleted_at is null and weight > 0;
    else
      select avg(percentage_complete) into v_avg
      from tasks where parent_task_id = p_task_id and deleted_at is null;
    end if;
    update tasks set percentage_complete = round(coalesce(v_avg,0),2) where id = p_task_id;
  end if;

  select parent_task_id, milestone_id into v_parent, v_milestone from tasks where id = p_task_id;

  if v_parent is not null then
    perform recalc_task_subtree(v_parent);
  elsif v_milestone is not null then
    perform recalc_milestone_progress(v_milestone);
  end if;
end;
$$;

create or replace function trg_task_progress_change() returns trigger
language plpgsql as $$
begin
  perform recalc_task_subtree(new.id);
  if TG_OP = 'UPDATE' and old.parent_task_id is distinct from new.parent_task_id and old.parent_task_id is not null then
    perform recalc_task_subtree(old.parent_task_id);
  end if;
  if TG_OP = 'UPDATE' and old.milestone_id is distinct from new.milestone_id and old.milestone_id is not null and new.parent_task_id is null then
    perform recalc_milestone_progress(old.milestone_id);
  end if;
  return new;
end;
$$;
create trigger trg_tasks_progress
  after insert or update of percentage_complete, status, weight, parent_task_id, milestone_id
  on tasks for each row execute function trg_task_progress_change();

create or replace function trg_task_delete_progress() returns trigger
language plpgsql as $$
begin
  if old.parent_task_id is not null then
    perform recalc_task_subtree(old.parent_task_id);
  elsif old.milestone_id is not null then
    perform recalc_milestone_progress(old.milestone_id);
  end if;
  return old;
end;
$$;
create trigger trg_tasks_delete_progress after delete on tasks for each row execute function trg_task_delete_progress();

create or replace function trg_milestone_progress_change() returns trigger
language plpgsql as $$
begin
  perform recalc_initiative_progress(new.initiative_id);
  return new;
end;
$$;
create trigger trg_milestones_progress
  after insert or update of completion_percentage, weight, status
  on milestones for each row execute function trg_milestone_progress_change();

create or replace function trg_milestone_delete_progress() returns trigger
language plpgsql as $$
begin
  perform recalc_initiative_progress(old.initiative_id);
  return old;
end;
$$;
create trigger trg_milestones_delete_progress after delete on milestones for each row execute function trg_milestone_delete_progress();

-- ============================================================
-- HEALTH SCORE (spec §16): 30% milestone progress, 25% on-time completion,
-- 20% overdue impact, 15% open blockers, 10% update freshness. 80+=green, 60-79=amber, <60=red.
-- ============================================================
create or replace function recalc_health_score(p_initiative_id uuid) returns void
language plpgsql as $$
declare
  v_overridden boolean;
  v_milestone_component numeric;
  v_ontime_component numeric;
  v_overdue_component numeric;
  v_blockers_component numeric;
  v_freshness_component numeric;
  v_score numeric;
  v_health health_status;
  v_status initiative_status;
  v_threshold interval;
begin
  select health_overridden, percentage_complete, status into v_overridden, v_milestone_component, v_status
  from initiatives where id = p_initiative_id;

  if v_overridden then
    return;
  end if;

  select case when count(*) filter (where status = 'completed') = 0 then 100
    else 100.0 * count(*) filter (where status = 'completed' and completion_date <= due_date) /
         nullif(count(*) filter (where status = 'completed'), 0)
  end into v_ontime_component
  from tasks where initiative_id = p_initiative_id and deleted_at is null;

  select case when count(*) filter (where status not in ('completed','cancelled')) = 0 then 100
    else 100.0 - (100.0 * count(*) filter (where status not in ('completed','cancelled') and due_date < current_date) /
         nullif(count(*) filter (where status not in ('completed','cancelled')), 0))
  end into v_overdue_component
  from tasks where initiative_id = p_initiative_id and deleted_at is null;

  select greatest(0, 100 - 20 * count(*)) into v_blockers_component
  from tasks where initiative_id = p_initiative_id and status = 'blocked' and deleted_at is null;

  select (o.no_update_threshold_days || ' days')::interval into v_threshold
  from organizations o join initiatives i on i.organization_id = o.id where i.id = p_initiative_id;

  select case
    when last_update_at is null then 40
    when now() - last_update_at <= v_threshold then 100
    else 50
  end into v_freshness_component
  from initiatives where id = p_initiative_id;

  v_score := round(
    0.30 * coalesce(v_milestone_component, 0) +
    0.25 * coalesce(v_ontime_component, 100) +
    0.20 * coalesce(v_overdue_component, 100) +
    0.15 * coalesce(v_blockers_component, 100) +
    0.10 * coalesce(v_freshness_component, 100)
  , 2);

  v_health := case when v_score >= 80 then 'green' when v_score >= 60 then 'amber' else 'red' end;
  if v_status = 'on_hold' then v_health := 'grey'; end if;
  if v_status = 'completed' then v_health := 'blue'; end if;

  update initiatives set health_score = v_score, health = v_health where id = p_initiative_id;

  insert into health_scores (
    initiative_id, score, health, milestone_progress_component, on_time_completion_component,
    overdue_impact_component, open_blockers_component, update_freshness_component, is_override
  ) values (
    p_initiative_id, v_score, v_health, v_milestone_component, v_ontime_component,
    v_overdue_component, v_blockers_component, v_freshness_component, false
  );
end;
$$;

-- Recompute health whenever task status/due date changes (overdue/blocked impact) or an update lands (freshness)
create or replace function trg_task_health_trigger() returns trigger
language plpgsql as $$
begin
  perform recalc_health_score(coalesce(new.initiative_id, old.initiative_id));
  return coalesce(new, old);
end;
$$;
create trigger trg_tasks_health after insert or update of status, due_date or delete on tasks for each row execute function trg_task_health_trigger();

create or replace function trg_initiative_update_freshness() returns trigger
language plpgsql as $$
begin
  update initiatives set last_update_at = now() where id = new.initiative_id;
  perform recalc_health_score(new.initiative_id);
  return new;
end;
$$;
create trigger trg_initiative_updates_freshness after insert on initiative_updates for each row execute function trg_initiative_update_freshness();

-- Manual override handling: clear health_score history is_override flag + audit
create or replace function trg_initiative_health_override() returns trigger
language plpgsql as $$
begin
  if new.health_overridden and (old.health_overridden is distinct from new.health_overridden or old.health is distinct from new.health) then
    insert into health_scores (initiative_id, score, health, is_override, override_reason, computed_by)
    values (new.id, new.health_score, new.health, true, new.health_override_reason, new.health_overridden_by);
    insert into audit_logs (organization_id, entity_type, entity_id, action, actor_id, previous_value, new_value, reason)
    values (new.organization_id, 'initiative', new.id, 'health_overridden', new.health_overridden_by,
            jsonb_build_object('health', old.health, 'score', old.health_score),
            jsonb_build_object('health', new.health, 'score', new.health_score),
            new.health_override_reason);
  end if;
  return new;
end;
$$;
create trigger trg_initiatives_health_override
  after update of health_overridden, health on initiatives
  for each row execute function trg_initiative_health_override();

-- ============================================================
-- AUDIT + HISTORY TRIGGERS
-- ============================================================
create or replace function trg_task_status_audit() returns trigger
language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into status_history (entity_type, entity_id, previous_status, new_status, changed_by)
    values ('task', new.id, old.status::text, new.status::text, auth.uid());
    insert into audit_logs (organization_id, entity_type, entity_id, action, actor_id, previous_value, new_value)
    values (new.organization_id, 'task', new.id, 'status_changed', auth.uid(),
            jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  return new;
end;
$$;
create trigger trg_tasks_status_audit after update of status on tasks for each row execute function trg_task_status_audit();

create or replace function trg_task_set_original_due_date() returns trigger
language plpgsql as $$
begin
  if new.original_due_date is null and new.due_date is not null then
    new.original_due_date := new.due_date;
  end if;
  return new;
end;
$$;
create trigger trg_tasks_original_due_date before insert on tasks for each row execute function trg_task_set_original_due_date();

-- Prevent completing a task while mandatory (non-cancelled) children are incomplete
create or replace function trg_prevent_incomplete_parent_completion() returns trigger
language plpgsql as $$
declare
  v_open_children int;
begin
  if new.status = 'completed' and (old.status is distinct from new.status) then
    select count(*) into v_open_children from tasks
      where parent_task_id = new.id and deleted_at is null and status not in ('completed','cancelled');
    if v_open_children > 0 then
      raise exception 'Cannot complete task % while % subtask(s) remain incomplete', new.id, v_open_children;
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_tasks_prevent_incomplete_completion
  before update of status on tasks for each row execute function trg_prevent_incomplete_parent_completion();

-- Delegation: target user must be active & same organization; audit + notify
create or replace function trg_task_delegation_insert() returns trigger
language plpgsql as $$
declare
  v_org uuid;
  v_target_active boolean;
  v_target_org uuid;
begin
  select organization_id into v_org from tasks where id = new.task_id;
  select is_active, organization_id into v_target_active, v_target_org from profiles where id = new.delegated_to;

  if v_target_org is distinct from v_org then
    raise exception 'Cannot delegate to a user outside the organization';
  end if;
  if not coalesce(v_target_active, false) then
    raise exception 'Cannot delegate to an inactive user';
  end if;

  insert into audit_logs (organization_id, entity_type, entity_id, action, actor_id, new_value)
  values (v_org, 'task', new.task_id, 'delegated', new.delegated_by,
          jsonb_build_object('delegated_to', new.delegated_to, 'due_date', new.delegated_due_date, 'instructions', new.instructions));

  insert into notifications (organization_id, user_id, type, title, body, entity_type, entity_id)
  values (v_org, new.delegated_to, 'task_delegated', 'Task delegated to you',
          new.instructions, 'task', new.task_id);

  return new;
end;
$$;
create trigger trg_task_delegations_insert before insert on task_delegations for each row execute function trg_task_delegation_insert();

-- Notify on assignment
create or replace function trg_task_assignment_notify() returns trigger
language plpgsql as $$
declare
  v_org uuid;
  v_title text;
begin
  select organization_id into v_org from tasks where id = new.task_id;
  if new.assignment_role = 'responsible' then
    select title into v_title from tasks where id = new.task_id;
    insert into notifications (organization_id, user_id, type, title, body, entity_type, entity_id)
    values (v_org, new.user_id, 'task_assigned', 'New task assigned: ' || coalesce(v_title,''), null, 'task', new.task_id);
  end if;
  return new;
end;
$$;
create trigger trg_task_assignments_notify after insert on task_assignments for each row execute function trg_task_assignment_notify();

-- Notify leadership on leadership-level escalations
create or replace function trg_escalation_notify() returns trigger
language plpgsql as $$
declare
  v_leader record;
begin
  if new.level in ('leadership','critical_leadership') then
    for v_leader in
      select ur.user_id from user_roles ur join roles r on r.id = ur.role_id
      where r.key in ('md_ceo','director','super_admin') and ur.organization_id = new.organization_id
    loop
      insert into notifications (organization_id, user_id, type, title, body, entity_type, entity_id)
      values (new.organization_id, v_leader.user_id, 'escalation_raised', new.title, new.description, 'escalation', new.id);
    end loop;
  end if;
  return new;
end;
$$;
create trigger trg_escalations_notify after insert on escalations for each row execute function trg_escalation_notify();

-- Approval requested / decided notifications
create or replace function trg_approval_notify() returns trigger
language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    insert into notifications (organization_id, user_id, type, title, body, entity_type, entity_id)
    select organization_id, new.approver_id, 'approval_requested'::notification_type, 'Approval requested', null, new.entity_type, new.entity_id
    from tasks where id = new.entity_id and new.entity_type = 'task'
    union all
    select organization_id, new.approver_id, 'approval_requested'::notification_type, 'Approval requested', null, new.entity_type, new.entity_id
    from milestones m join initiatives i on i.id = m.initiative_id where m.id = new.entity_id and new.entity_type = 'milestone';
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status and new.status <> 'pending' then
    insert into notifications (organization_id, user_id, type, title, body, entity_type, entity_id)
    select organization_id, new.requested_by, 'approval_completed'::notification_type, 'Approval ' || new.status::text, new.comment, new.entity_type, new.entity_id
    from tasks where id = new.entity_id and new.entity_type = 'task'
    union all
    select organization_id, new.requested_by, 'approval_completed'::notification_type, 'Approval ' || new.status::text, new.comment, new.entity_type, new.entity_id
    from milestones m join initiatives i on i.id = m.initiative_id where m.id = new.entity_id and new.entity_type = 'milestone';
  end if;
  return new;
end;
$$;
create trigger trg_approvals_notify after insert or update of status on approvals for each row execute function trg_approval_notify();

-- ============================================================
-- RPC: controlled due-date change (captures mandatory reason + history)
-- ============================================================
create or replace function set_task_due_date(p_task_id uuid, p_new_due_date date, p_reason text) returns void
language plpgsql security invoker as $$
declare
  v_old_due_date date;
  v_org uuid;
begin
  select due_date, organization_id into v_old_due_date, v_org from tasks where id = p_task_id;
  if v_old_due_date is distinct from p_new_due_date then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'A reason is required to change the due date';
    end if;
    insert into due_date_history (task_id, original_due_date, new_due_date, changed_by, reason)
    values (p_task_id, v_old_due_date, p_new_due_date, auth.uid(), p_reason);

    update tasks set due_date = p_new_due_date, extension_count = extension_count + 1 where id = p_task_id;

    insert into audit_logs (organization_id, entity_type, entity_id, action, actor_id, previous_value, new_value, reason)
    values (v_org, 'task', p_task_id, 'due_date_changed', auth.uid(),
            jsonb_build_object('due_date', v_old_due_date), jsonb_build_object('due_date', p_new_due_date), p_reason);
  end if;
end;
$$;

-- ============================================================
-- RPC: manual health override (records reason + audit via trigger above)
-- ============================================================
create or replace function override_initiative_health(p_initiative_id uuid, p_health health_status, p_reason text) returns void
language plpgsql security invoker as $$
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to override initiative health';
  end if;
  update initiatives set
    health = p_health,
    health_overridden = true,
    health_override_reason = p_reason,
    health_overridden_by = auth.uid(),
    health_overridden_at = now()
  where id = p_initiative_id;
end;
$$;

create or replace function clear_initiative_health_override(p_initiative_id uuid) returns void
language plpgsql security invoker as $$
begin
  update initiatives set health_overridden = false, health_override_reason = null,
    health_overridden_by = null, health_overridden_at = null
  where id = p_initiative_id;
  perform recalc_health_score(p_initiative_id);
end;
$$;
