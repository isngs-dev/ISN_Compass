-- Doc: "The Admin can ... Edit or archive initiatives" — archiving is distinct from
-- the Completed status (an abandoned initiative isn't "done"), so it's its own flag.
alter table initiatives add column is_archived boolean not null default false;
create index idx_initiatives_archived on initiatives(is_archived);
