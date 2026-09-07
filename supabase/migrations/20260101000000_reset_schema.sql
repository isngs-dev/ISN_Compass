-- iSN Compass: 0000 — Full reset.
-- The old schema (organizations/RBAC/governance/delegation/meetings/etc.) no longer
-- matches the product. Confirmed with the project owner: no real data to preserve,
-- safe to drop everything in `public` and rebuild from scratch in 0001_init.sql.
drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
