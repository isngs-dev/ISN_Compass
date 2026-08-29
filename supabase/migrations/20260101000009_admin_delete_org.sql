-- Maintenance-only helper for wiping a demo/test organization (used by the seed script).
-- audit_logs is intentionally append-only for all normal app mutations (see trg_forbid_audit_delete),
-- so a full org teardown needs to bypass triggers for the duration of this single transaction.
-- Restricted to service_role only — never exposed to authenticated app users.
create or replace function admin_delete_organization(p_org_id uuid) returns void
language plpgsql security definer as $$
begin
  set local session_replication_role = replica;
  delete from organizations where id = p_org_id;
  set local session_replication_role = origin;
end;
$$;

revoke all on function admin_delete_organization(uuid) from public;
grant execute on function admin_delete_organization(uuid) to service_role;
