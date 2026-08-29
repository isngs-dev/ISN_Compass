-- Fix: insert into notifications ... select ... needs an explicit cast to notification_type,
-- since implicit literal coercion only applies to VALUES clauses, not SELECT/UNION ALL.
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
