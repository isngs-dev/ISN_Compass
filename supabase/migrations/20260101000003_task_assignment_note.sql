-- Doc step 4: the task assignment email includes "Admin's instructions" as a line
-- item distinct from the task description — a short note entered at assignment time.
alter table tasks add column assignment_note text;
