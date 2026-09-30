-- Team members can now be given a login (created by the Admin) to see and complete
-- their own tasks. That breaks the old "authenticated == the Admin" assumption, so
-- every RLS policy is narrowed to is_admin(). Members get no RLS access at all —
-- their pages read/write through the service-role client, scoped to their own
-- team_members row in the server code (same pattern as the /confirm link).

alter table team_members
  add column username citext unique,
  add column user_id uuid unique references auth.users(id) on delete set null;

-- Admin = auth user whose app_metadata.role is 'admin'. app_metadata can only be
-- written with the service role, so a user can't promote themselves. Reads
-- auth.users directly (not the JWT) so a role change applies immediately.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select raw_app_meta_data->>'role' = 'admin' from auth.users where id = auth.uid()), false);
$$;

-- Before this migration only the Admin had an account, so every existing auth user is the Admin.
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb;

drop policy "authenticated full access" on departments;
drop policy "authenticated full access" on team_members;
drop policy "authenticated full access" on initiatives;
drop policy "authenticated full access" on tasks;
drop policy "authenticated read" on activity_log;
drop policy "authenticated insert" on activity_log;

create policy "admin full access" on departments for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin full access" on team_members for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin full access" on initiatives for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin full access" on tasks for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin read" on activity_log for select
  using ((select public.is_admin()));
create policy "admin insert" on activity_log for insert
  with check ((select public.is_admin()));
