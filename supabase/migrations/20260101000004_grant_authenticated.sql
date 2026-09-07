-- The schema reset (0000) granted `usage` on the public schema but never granted
-- actual table privileges to `authenticated` — RLS policies only narrow an
-- existing GRANT, they don't substitute for one, so every query as the Admin
-- was failing with "permission denied for table X" before RLS was even reached.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
