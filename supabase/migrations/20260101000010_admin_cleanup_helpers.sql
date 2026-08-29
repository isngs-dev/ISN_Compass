-- Replaces the 0009 helper: session_replication_role='replica' disabled ALL triggers,
-- including FK cascade-delete triggers, which orphaned child rows instead of cascading.
-- Toggle only the audit_logs append-only trigger instead, so normal cascades still work.
-- Needed because deleting an auth user cascades profiles -> audit_logs.actor_id, which
-- also hits trg_forbid_audit_delete.
drop function if exists admin_delete_organization(uuid);

create or replace function admin_set_audit_log_delete_enabled(p_enabled boolean) returns void
language plpgsql security definer as $$
begin
  if p_enabled then
    execute 'alter table audit_logs enable trigger trg_forbid_audit_delete';
  else
    execute 'alter table audit_logs disable trigger trg_forbid_audit_delete';
  end if;
end;
$$;

revoke all on function admin_set_audit_log_delete_enabled(boolean) from public;
grant execute on function admin_set_audit_log_delete_enabled(boolean) to service_role;

create or replace function admin_delete_organization(p_org_id uuid) returns void
language plpgsql security definer as $$
begin
  delete from organizations where id = p_org_id;
end;
$$;

revoke all on function admin_delete_organization(uuid) from public;
grant execute on function admin_delete_organization(uuid) to service_role;
