-- iSN Compass: 0007 — Reference data: roles, permissions, role_permissions
-- (Global/master data, not organization-scoped — safe to run once per database.)

insert into roles (key, name, description, rank) values
  ('super_admin','Super Admin','Full system access',0),
  ('md_ceo','MD / CEO','Full leadership visibility and authority',1),
  ('director','Director','Leadership visibility per assigned scope',2),
  ('business_head','Business Head','Business vertical visibility and ownership',3),
  ('manager','Manager','Team and initiative-level visibility',4),
  ('team_lead','Team Lead','Assigned and team work',5),
  ('employee','Employee','Assigned work',6),
  ('viewer','Viewer','Read-only access',7);

insert into permissions (key, description) values
  ('initiative.create','Create initiatives'),
  ('initiative.manage','Edit/manage any initiative in scope'),
  ('initiative.view_confidential','View leadership-confidential and restricted records'),
  ('initiative.override_health','Manually override initiative health score'),
  ('vertical.manage','Create/manage business verticals'),
  ('goal.manage','Create/manage strategic goals'),
  ('task.manage_any','Create/edit tasks broadly across assigned scope'),
  ('task.delegate','Delegate tasks to other users'),
  ('task.approve','Approve/reject work submitted for approval'),
  ('decision.manage','Record/manage decisions'),
  ('meeting.manage','Create/manage strategy review meetings'),
  ('escalation.manage','Raise, view and resolve escalations'),
  ('admin.manage','Manage organization, users, roles and settings');

-- role -> permission grants
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p where r.key = 'super_admin';

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p where r.key = 'md_ceo';

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'director' and p.key in (
  'initiative.create','initiative.manage','initiative.view_confidential','initiative.override_health',
  'goal.manage','task.manage_any','task.delegate','task.approve','decision.manage','meeting.manage','escalation.manage'
);

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'business_head' and p.key in (
  'initiative.create','initiative.manage','vertical.manage','task.manage_any','task.delegate','task.approve','escalation.manage'
);

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'manager' and p.key in ('task.manage_any','task.delegate','task.approve','escalation.manage');

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'team_lead' and p.key in ('task.delegate','escalation.manage');

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'employee' and p.key in ('escalation.manage');

-- viewer: no write permissions
