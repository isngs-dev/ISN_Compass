-- One-off repair helper: force-delete specific profiles regardless of referencing rows.
-- Only needed to clean up orphaned rows left by an earlier flawed cleanup attempt
-- (organization row was deleted under session_replication_role=replica, which also
-- disabled cascades, orphaning its children instead of removing them).
create or replace function admin_force_delete_profiles(p_ids uuid[]) returns void
language plpgsql security definer as $$
begin
  set local session_replication_role = replica;
  delete from profiles where id = any(p_ids);
  set local session_replication_role = origin;
end;
$$;

revoke all on function admin_force_delete_profiles(uuid[]) from public;
grant execute on function admin_force_delete_profiles(uuid[]) to service_role;
