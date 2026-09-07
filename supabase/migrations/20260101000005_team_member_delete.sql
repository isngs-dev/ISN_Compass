-- Deleting a team member (only offered in the UI after they're already deactivated)
-- should unassign their tasks rather than being blocked by the FK, or deleted along
-- with them — task history/activity_log already record the assignment as text.
alter table tasks drop constraint tasks_assigned_to_fkey;
alter table tasks add constraint tasks_assigned_to_fkey
  foreign key (assigned_to) references team_members(id) on delete set null;
