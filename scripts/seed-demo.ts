/**
 * Demo data seed script for iSN Compass.
 *
 * Creates a full demo organization: auth users + profiles, roles, business
 * verticals, strategic goals, 7 initiatives (with milestones/tasks/assignments/
 * delegation), issues, risks, decisions, escalations, approvals, and a
 * completed strategy review meeting.
 *
 * Usage: pnpm seed   (requires .env.local with SUPABASE_SERVICE_ROLE_KEY)
 *
 * Safe to re-run: it always creates a fresh organization (unique slug per run
 * would collide, so it deletes any existing org with the same slug first).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_SLUG = "isn-group";
const DEMO_PASSWORD = "Compass!Demo2026";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code(prefix: string) {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `${prefix}-${s}`;
}

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

async function insert<T = Record<string, unknown>>(table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.from(table).insert(row).select().single();
  if (error) throw new Error(`insert ${table} failed: ${error.message}`);
  return data as T;
}

async function insertMany<T = Record<string, unknown>>(table: string, rows: Record<string, unknown>[]): Promise<T[]> {
  const { data, error } = await admin.from(table).insert(rows).select();
  if (error) throw new Error(`insertMany ${table} failed: ${error.message}`);
  return data as T[];
}

async function main() {
  console.log("Seeding iSN Compass demo data...");

  // ------------------------------------------------------------------
  // Clean up any previous run of this demo org
  // ------------------------------------------------------------------
  // Also clean up any orphaned demo auth users/profiles left over from prior failed runs
  // (email lookup, since they may not be attached to a live organization row anymore).
  const { data: existingOrg } = await admin.from("organizations").select("id").eq("slug", ORG_SLUG).maybeSingle();
  const { data: orphanProfiles } = await admin.from("profiles").select("id").like("email", "%@isngroup.demo");
  const cleanupNeeded = existingOrg || (orphanProfiles && orphanProfiles.length > 0);

  if (cleanupNeeded) {
    console.log("Removing previous demo organization...");
    // audit_logs is append-only; deleting the org cascades to audit_logs rows (and everything
    // else), which hits that trigger. Disable it for cleanup only.
    const { error: disableErr } = await admin.rpc("admin_set_audit_log_delete_enabled", { p_enabled: false });
    if (disableErr) throw new Error(`disable audit trigger failed: ${disableErr.message}`);

    // Delete the org FIRST: this cascades away profiles and every dependent row (comments,
    // decisions, approvals, etc.) in one statement, satisfying all the profiles(id) FK
    // references at once. Deleting auth.users individually beforehand would fail — those
    // FKs are NO ACTION, and a lone profile can't be removed while dependents still exist.
    if (existingOrg) {
      const { error: delErr } = await admin.rpc("admin_delete_organization", { p_org_id: existingOrg.id });
      if (delErr) throw new Error(`delete organizations failed: ${delErr.message}`);
    }

    // Now safe to delete the auth.users rows: their profiles (and everything referencing them)
    // are already gone.
    for (const p of orphanProfiles ?? []) {
      const { error } = await admin.auth.admin.deleteUser(p.id);
      if (error) throw new Error(`deleteUser ${p.id} failed: ${error.message}`);
    }

    const { error: enableErr } = await admin.rpc("admin_set_audit_log_delete_enabled", { p_enabled: true });
    if (enableErr) throw new Error(`re-enable audit trigger failed: ${enableErr.message}`);
  }

  // ------------------------------------------------------------------
  // Organization
  // ------------------------------------------------------------------
  const org = await insert<{ id: string }>("organizations", {
    name: "iSN Group",
    slug: ORG_SLUG,
    no_update_threshold_days: 7,
  });
  const orgId = org.id;

  // ------------------------------------------------------------------
  // Roles lookup (global reference data, seeded by migration 0007)
  // ------------------------------------------------------------------
  const { data: roleRows, error: roleErr } = await admin.from("roles").select("id, key");
  if (roleErr) throw roleErr;
  const roleIdByKey = new Map((roleRows ?? []).map((r) => [r.key, r.id as string]));

  // ------------------------------------------------------------------
  // Users (created top-down so manager_id can reference the previous row)
  // ------------------------------------------------------------------
  interface UserSeed {
    key: string;
    full_name: string;
    email: string;
    title: string;
    org_level: string;
    role: string;
    manager?: string;
  }

  const userSeeds: UserSeed[] = [
    { key: "sarah", full_name: "Sarah Chen", email: "sarah.chen@isngroup.demo", title: "MD / CEO", org_level: "l1_md_ceo", role: "md_ceo" },
    { key: "david", full_name: "David Kim", email: "david.kim@isngroup.demo", title: "Director, Technology", org_level: "l2_director", role: "director", manager: "sarah" },
    { key: "priya", full_name: "Priya Nair", email: "priya.nair@isngroup.demo", title: "Director, Growth & Delivery", org_level: "l2_director", role: "director", manager: "sarah" },
    { key: "marcus", full_name: "Marcus Reyes", email: "marcus.reyes@isngroup.demo", title: "Business Head, Technology & Product", org_level: "l3_business_head", role: "business_head", manager: "david" },
    { key: "elena", full_name: "Elena Petrova", email: "elena.petrova@isngroup.demo", title: "Business Head, Client Delivery", org_level: "l3_business_head", role: "business_head", manager: "priya" },
    { key: "rahul", full_name: "Rahul Mehta", email: "rahul.mehta@isngroup.demo", title: "Business Head, Sales & Growth", org_level: "l3_business_head", role: "business_head", manager: "priya" },
    { key: "aisha", full_name: "Aisha Rahman", email: "aisha.rahman@isngroup.demo", title: "Manager, Platform Engineering", org_level: "l4_manager", role: "manager", manager: "marcus" },
    { key: "tom", full_name: "Tom Becker", email: "tom.becker@isngroup.demo", title: "Manager, Automation & Analytics", org_level: "l4_manager", role: "manager", manager: "marcus" },
    { key: "liu", full_name: "Liu Wei", email: "liu.wei@isngroup.demo", title: "Manager, Client Solutions", org_level: "l4_manager", role: "manager", manager: "elena" },
    { key: "sophie", full_name: "Sophie Laurent", email: "sophie.laurent@isngroup.demo", title: "Manager, Sales Systems", org_level: "l4_manager", role: "manager", manager: "rahul" },
    { key: "grace", full_name: "Grace Okafor", email: "grace.okafor@isngroup.demo", title: "Team Lead, Scheduler Squad", org_level: "l5_team_lead", role: "team_lead", manager: "aisha" },
    { key: "noah", full_name: "Noah Fischer", email: "noah.fischer@isngroup.demo", title: "Team Lead, Chatbot Squad", org_level: "l5_team_lead", role: "team_lead", manager: "tom" },
    { key: "maria", full_name: "Maria Santos", email: "maria.santos@isngroup.demo", title: "Frontend Engineer", org_level: "l6_employee", role: "employee", manager: "grace" },
    { key: "james", full_name: "James O'Brien", email: "james.obrien@isngroup.demo", title: "Backend Engineer", org_level: "l6_employee", role: "employee", manager: "grace" },
    { key: "fatima", full_name: "Fatima Al-Sayed", email: "fatima.alsayed@isngroup.demo", title: "Data Analyst", org_level: "l6_employee", role: "employee", manager: "tom" },
    { key: "kevin", full_name: "Kevin Zhang", email: "kevin.zhang@isngroup.demo", title: "QA Engineer", org_level: "l6_employee", role: "employee", manager: "noah" },
    { key: "daniel", full_name: "Daniel Osei", email: "daniel.osei@isngroup.demo", title: "Sales Ops Analyst", org_level: "l6_employee", role: "employee", manager: "sophie" },
  ];

  const userId = new Map<string, string>();

  for (const u of userSeeds) {
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (authErr) throw new Error(`createUser ${u.email} failed: ${authErr.message}`);
    const id = authUser.user.id;
    userId.set(u.key, id);

    await insert("profiles", {
      id,
      organization_id: orgId,
      full_name: u.full_name,
      email: u.email,
      title: u.title,
      org_level: u.org_level,
      manager_id: u.manager ? userId.get(u.manager) : null,
      is_active: true,
    });

    const roleId = roleIdByKey.get(u.role);
    if (!roleId) throw new Error(`Unknown role key ${u.role}`);
    await insert("user_roles", { user_id: id, role_id: roleId, organization_id: orgId, granted_by: userId.get("sarah") ?? id });
  }

  console.log(`Created ${userSeeds.length} demo users (password: ${DEMO_PASSWORD})`);

  // ------------------------------------------------------------------
  // Business verticals
  // ------------------------------------------------------------------
  const verticalTech = await insert<{ id: string }>("business_verticals", {
    organization_id: orgId,
    name: "Technology & Product",
    description: "Internal platforms, tooling and product engineering.",
    vertical_head_id: userId.get("marcus"),
    created_by: userId.get("sarah"),
  });
  const verticalDelivery = await insert<{ id: string }>("business_verticals", {
    organization_id: orgId,
    name: "Client Delivery",
    description: "Client-facing delivery, automation and support experience.",
    vertical_head_id: userId.get("elena"),
    created_by: userId.get("sarah"),
  });
  const verticalSales = await insert<{ id: string }>("business_verticals", {
    organization_id: orgId,
    name: "Sales & Growth",
    description: "Revenue generation, sales tooling and growth systems.",
    vertical_head_id: userId.get("rahul"),
    created_by: userId.get("sarah"),
  });

  // ------------------------------------------------------------------
  // Strategic goals
  // ------------------------------------------------------------------
  const goalPlatforms = await insert<{ id: string }>("strategic_goals", {
    organization_id: orgId,
    name: "Scale Digital Platforms",
    description: "Consolidate and automate internal platforms to support 30% efficiency gains.",
    period: "FY2026",
    owner_id: userId.get("marcus"),
    target: "Launch 3 platform initiatives supporting a 30% efficiency gain",
    status: "on_track",
    progress: 42,
    business_vertical_id: verticalTech.id,
    created_by: userId.get("sarah"),
  });
  const goalEngagement = await insert<{ id: string }>("strategic_goals", {
    organization_id: orgId,
    name: "Expand Automated Client Engagement",
    description: "Deploy automation to improve client response times and satisfaction.",
    period: "FY2026",
    owner_id: userId.get("elena"),
    target: "Automate 50% of first-line client interactions",
    status: "at_risk",
    progress: 28,
    business_vertical_id: verticalDelivery.id,
    created_by: userId.get("sarah"),
  });
  const goalRevenue = await insert<{ id: string }>("strategic_goals", {
    organization_id: orgId,
    name: "Accelerate Revenue Growth via Sales Tech",
    description: "Modernize sales tooling to increase pipeline velocity and conversion.",
    period: "FY2026",
    owner_id: userId.get("rahul"),
    target: "Increase qualified pipeline conversion by 20%",
    status: "on_track",
    progress: 51,
    business_vertical_id: verticalSales.id,
    created_by: userId.get("sarah"),
  });

  // ------------------------------------------------------------------
  // Initiatives
  // ------------------------------------------------------------------
  interface InitiativeSeed {
    key: string;
    name: string;
    description: string;
    vertical: string;
    goal: string | null;
    category: string;
    priority: string;
    status: string;
    exec_sponsor: string;
    accountable_owner: string;
    responsible_manager: string;
    contributors: string[];
    target_completion_date?: string;
    actual_completion_date?: string;
  }

  const initiativeSeeds: InitiativeSeed[] = [
    {
      key: "ms_dashboard",
      name: "MS Dashboard",
      description: "Unified management dashboard consolidating KPIs across initiatives for leadership visibility.",
      vertical: verticalTech.id,
      goal: goalPlatforms.id,
      category: "technology",
      priority: "p2_high",
      status: "active",
      exec_sponsor: "david",
      accountable_owner: "marcus",
      responsible_manager: "aisha",
      contributors: ["grace", "maria", "james"],
      target_completion_date: daysFromNow(60),
    },
    {
      key: "ms_scheduler",
      name: "MS Scheduler Platform",
      description: "Automated scheduling platform replacing manual resource allocation across client engagements.",
      vertical: verticalTech.id,
      goal: goalPlatforms.id,
      category: "automation",
      priority: "p1_critical",
      status: "active",
      exec_sponsor: "david",
      accountable_owner: "marcus",
      responsible_manager: "aisha",
      contributors: ["grace", "maria", "james"],
      target_completion_date: daysFromNow(75),
    },
    {
      key: "shopper_chatbot",
      name: "Shopper Chatbot",
      description: "AI-driven chatbot for e-commerce clients to automate shopper support and increase conversion.",
      vertical: verticalDelivery.id,
      goal: goalEngagement.id,
      category: "automation",
      priority: "p2_high",
      status: "active",
      exec_sponsor: "priya",
      accountable_owner: "elena",
      responsible_manager: "tom",
      contributors: ["noah", "fatima", "kevin"],
      target_completion_date: daysFromNow(50),
    },
    {
      key: "sales_automation",
      name: "Sales Automation Engine",
      description: "End-to-end automation of lead scoring, CRM sync and sales workflows to accelerate pipeline velocity.",
      vertical: verticalSales.id,
      goal: goalRevenue.id,
      category: "revenue_growth",
      priority: "p1_critical",
      status: "active",
      exec_sponsor: "priya",
      accountable_owner: "rahul",
      responsible_manager: "sophie",
      contributors: ["daniel"],
      target_completion_date: daysFromNow(45),
    },
    {
      key: "cr3_model",
      name: "CR3 Performance Model",
      description: "Predictive performance model for client retention & revenue (CR3) analytics, expanding into churn prediction.",
      vertical: verticalSales.id,
      goal: goalRevenue.id,
      category: "operational_improvement",
      priority: "p3_normal",
      status: "active",
      exec_sponsor: "rahul",
      accountable_owner: "rahul",
      responsible_manager: "sophie",
      contributors: ["daniel"],
      target_completion_date: daysFromNow(90),
    },
    {
      key: "client_portal",
      name: "Client Portal Revamp",
      description: "Redesign of the client-facing portal; paused pending Q3 budget review.",
      vertical: verticalDelivery.id,
      goal: null,
      category: "client_delivery",
      priority: "p3_normal",
      status: "on_hold",
      exec_sponsor: "priya",
      accountable_owner: "elena",
      responsible_manager: "liu",
      contributors: [],
      target_completion_date: daysFromNow(120),
    },
    {
      key: "legacy_decommission",
      name: "Legacy System Decommission",
      description: "Decommissioning of the legacy scheduling tool now fully replaced by MS Scheduler Platform.",
      vertical: verticalTech.id,
      goal: null,
      category: "cost_reduction",
      priority: "p4_low",
      status: "completed",
      exec_sponsor: "david",
      accountable_owner: "marcus",
      responsible_manager: "aisha",
      contributors: [],
      target_completion_date: daysFromNow(-20),
      actual_completion_date: daysFromNow(-15),
    },
  ];

  const initiativeId = new Map<string, string>();

  for (const init of initiativeSeeds) {
    const row = await insert<{ id: string }>("initiatives", {
      organization_id: orgId,
      code: code("INIT"),
      name: init.name,
      description: init.description,
      business_vertical_id: init.vertical,
      strategic_goal_id: init.goal,
      category: init.category,
      priority: init.priority,
      status: init.status,
      start_date: daysFromNow(-30),
      target_completion_date: init.target_completion_date,
      actual_completion_date: init.actual_completion_date ?? null,
      visibility: "leadership_attention",
      confidentiality: "normal",
      created_by: userId.get(init.exec_sponsor),
    });
    initiativeId.set(init.key, row.id);

    if (init.goal) {
      await insert("goal_initiatives", { goal_id: init.goal, initiative_id: row.id, contribution_weight: 100 });
    }

    const members: { user_id: string; member_role: string }[] = [
      { user_id: userId.get(init.exec_sponsor)!, member_role: "executive_sponsor" },
      { user_id: userId.get(init.accountable_owner)!, member_role: "accountable_owner" },
      { user_id: userId.get(init.responsible_manager)!, member_role: "responsible_manager" },
      ...init.contributors.map((c) => ({ user_id: userId.get(c)!, member_role: "contributor" })),
    ];
    await insertMany(
      "initiative_members",
      members.map((m) => ({ initiative_id: row.id, user_id: m.user_id, member_role: m.member_role, assigned_by: userId.get("sarah") }))
    );

    await insert("audit_logs", {
      organization_id: orgId,
      entity_type: "initiative",
      entity_id: row.id,
      action: "created",
      actor_id: userId.get(init.exec_sponsor),
      new_value: { name: init.name, status: init.status },
    });
  }

  // ------------------------------------------------------------------
  // Milestones + Tasks per initiative
  // ------------------------------------------------------------------
  async function addTask(opts: {
    initiativeId: string;
    milestoneId: string;
    title: string;
    weight: number;
    status: string;
    percentage_complete: number;
    priority: string;
    responsibleKey: string;
    dueDate?: string | null;
    completionDate?: string | null;
    approvalRequired?: boolean;
    createdBy: string;
  }) {
    const task = await insert<{ id: string }>("tasks", {
      organization_id: orgId,
      code: code("TASK"),
      title: opts.title,
      initiative_id: opts.initiativeId,
      milestone_id: opts.milestoneId,
      weight: opts.weight,
      due_date: opts.dueDate ?? null,
      completion_date: opts.completionDate ?? null,
      priority: opts.priority,
      status: opts.status,
      percentage_complete: opts.percentage_complete,
      approval_required: opts.approvalRequired ?? false,
      assignment_date: new Date().toISOString(),
      created_by: opts.createdBy,
    });
    await insert("task_assignments", {
      task_id: task.id,
      user_id: userId.get(opts.responsibleKey),
      assignment_role: "responsible",
      assigned_by: opts.createdBy,
      is_active: true,
    });
    return task;
  }

  // MS Dashboard
  {
    const initId = initiativeId.get("ms_dashboard")!;
    const owner = userId.get("aisha")!;
    const m1 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Discovery & Requirements", weight: 25, status: "completed", owner_id: owner, due_date: daysFromNow(-10), created_by: owner });
    const m2 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Core Build", weight: 45, status: "active", owner_id: owner, due_date: daysFromNow(20), created_by: owner });
    const m3 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Rollout & Training", weight: 30, status: "planning", owner_id: owner, due_date: daysFromNow(55), created_by: owner });

    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Stakeholder interviews", weight: 40, status: "completed", percentage_complete: 100, priority: "p3_normal", responsibleKey: "grace", completionDate: daysFromNow(-14), createdBy: owner });
    const signOff = await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Requirements doc sign-off", weight: 60, status: "completed", percentage_complete: 100, priority: "p2_high", responsibleKey: "grace", completionDate: daysFromNow(-10), approvalRequired: true, createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m2.id, title: "KPI widget library", weight: 50, status: "in_progress", percentage_complete: 65, priority: "p2_high", responsibleKey: "maria", dueDate: daysFromNow(5), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Backend aggregation API", weight: 50, status: "in_progress", percentage_complete: 40, priority: "p2_high", responsibleKey: "aisha", dueDate: daysFromNow(8), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m3.id, title: "Rollout plan", weight: 40, status: "not_started", percentage_complete: 0, priority: "p3_normal", responsibleKey: "aisha", dueDate: daysFromNow(40), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m3.id, title: "Training sessions", weight: 60, status: "not_started", percentage_complete: 0, priority: "p3_normal", responsibleKey: "grace", dueDate: daysFromNow(50), createdBy: owner });

    await insert("approvals", { entity_type: "task", entity_id: signOff.id, requested_by: userId.get("grace"), approver_id: userId.get("aisha"), status: "pending" });
    await insert("initiative_updates", { initiative_id: initId, author_id: owner, completed_summary: "Requirements finalized and signed off.", in_progress_summary: "KPI widget library and aggregation API underway.", next_steps: "Complete core build, begin rollout planning.", confidence: "high" });
  }

  // MS Scheduler Platform (has a delegated task + a blocked task -> escalation + an overdue task)
  {
    const initId = initiativeId.get("ms_scheduler")!;
    const owner = userId.get("aisha")!;
    const m1 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Scheduling Engine Design", weight: 30, status: "completed", owner_id: owner, due_date: daysFromNow(-20), created_by: owner });
    const m2 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Automation Build", weight: 40, status: "active", owner_id: owner, due_date: daysFromNow(25), created_by: owner });
    const m3 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Pilot Rollout", weight: 30, status: "planning", owner_id: owner, due_date: daysFromNow(60), created_by: owner });

    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Engine architecture design", weight: 100, status: "completed", percentage_complete: 100, priority: "p1_critical", responsibleKey: "grace", completionDate: daysFromNow(-22), createdBy: owner });

    const rulesTask = await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Rules engine implementation", weight: 55, status: "in_progress", percentage_complete: 55, priority: "p1_critical", responsibleKey: "aisha", dueDate: daysFromNow(10), createdBy: owner });
    // Delegate this task from Aisha (manager) down to James (execution), preserving accountability chain.
    await admin.from("task_assignments").update({ is_active: false }).eq("task_id", rulesTask.id).eq("assignment_role", "responsible");
    await insert("task_assignments", { task_id: rulesTask.id, user_id: userId.get("james"), assignment_role: "responsible", assigned_by: userId.get("aisha"), is_active: true });
    await insert("task_delegations", { task_id: rulesTask.id, delegated_by: userId.get("aisha"), delegated_to: userId.get("james"), delegated_due_date: daysFromNow(10), original_due_date: daysFromNow(10), instructions: "Please take the rules engine build — align with the design doc from M1." });

    const blockedTask = await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Calendar sync integration", weight: 45, status: "blocked", percentage_complete: 30, priority: "p1_critical", responsibleKey: "maria", dueDate: daysFromNow(15), createdBy: owner });
    await insert("escalations", { organization_id: orgId, code: code("ESC"), title: "Calendar sync blocked on vendor API access", description: "Third-party calendar vendor has not yet approved our API access request.", initiative_id: initId, task_id: blockedTask.id, category: "technical", level: "manager", status: "open", raised_by: userId.get("maria"), assigned_to: userId.get("aisha") });

    await addTask({ initiativeId: initId, milestoneId: m3.id, title: "Pilot client onboarding", weight: 100, status: "not_started", percentage_complete: 0, priority: "p2_high", responsibleKey: "aisha", dueDate: daysFromNow(-5), createdBy: owner });

    await insert("initiative_updates", { initiative_id: initId, author_id: owner, completed_summary: "Engine architecture finalized.", in_progress_summary: "Rules engine in build; calendar sync blocked on vendor access.", next_steps: "Escalate vendor access; delegate rules engine build to James.", blockers: "Vendor API access pending approval.", needs_management_support: true, confidence: "medium" });
  }

  // Shopper Chatbot
  {
    const initId = initiativeId.get("shopper_chatbot")!;
    const owner = userId.get("tom")!;
    const m1 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Conversational Flow Design", weight: 25, status: "completed", owner_id: owner, due_date: daysFromNow(-15), created_by: owner });
    const m2 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "NLP Model Integration", weight: 45, status: "active", owner_id: owner, due_date: daysFromNow(18), created_by: owner });
    const m3 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Client Pilot Launch", weight: 30, status: "planning", owner_id: owner, due_date: daysFromNow(50), created_by: owner });

    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Design core conversation flows", weight: 100, status: "completed", percentage_complete: 100, priority: "p2_high", responsibleKey: "noah", completionDate: daysFromNow(-16), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Intent classification model", weight: 55, status: "in_progress", percentage_complete: 70, priority: "p2_high", responsibleKey: "fatima", dueDate: daysFromNow(6), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Fallback handling", weight: 45, status: "in_progress", percentage_complete: 35, priority: "p3_normal", responsibleKey: "kevin", dueDate: daysFromNow(12), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m3.id, title: "Select pilot client", weight: 100, status: "not_started", percentage_complete: 0, priority: "p3_normal", responsibleKey: "noah", dueDate: daysFromNow(35), createdBy: owner });

    await insert("initiative_updates", { initiative_id: initId, author_id: owner, completed_summary: "Conversation flows finalized.", in_progress_summary: "NLP model integration underway.", next_steps: "Complete fallback handling, select pilot client.", confidence: "high" });
  }

  // Sales Automation Engine
  {
    const initId = initiativeId.get("sales_automation")!;
    const owner = userId.get("sophie")!;
    const m1 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "CRM Integration", weight: 30, status: "completed", owner_id: owner, due_date: daysFromNow(-8), created_by: owner });
    const m2 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Lead Scoring Automation", weight: 40, status: "active", owner_id: owner, due_date: daysFromNow(15), created_by: owner });
    const m3 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Full Rollout", weight: 30, status: "planning", owner_id: owner, due_date: daysFromNow(45), created_by: owner });

    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "CRM API integration", weight: 100, status: "completed", percentage_complete: 100, priority: "p1_critical", responsibleKey: "sophie", completionDate: daysFromNow(-9), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Lead scoring model build", weight: 55, status: "in_progress", percentage_complete: 50, priority: "p1_critical", responsibleKey: "daniel", dueDate: daysFromNow(9), createdBy: owner });

    const trainingTask = await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Sales team training materials", weight: 45, status: "blocked", percentage_complete: 20, priority: "p2_high", responsibleKey: "sophie", dueDate: daysFromNow(14), createdBy: owner });
    await insert("escalations", { organization_id: orgId, code: code("ESC"), title: "Sales training rollout under-resourced", description: "No dedicated enablement resource assigned to build training materials.", initiative_id: initId, task_id: trainingTask.id, category: "resource", level: "department_head", status: "open", raised_by: userId.get("sophie"), assigned_to: userId.get("rahul") });

    await addTask({ initiativeId: initId, milestoneId: m3.id, title: "Regional rollout plan", weight: 100, status: "not_started", percentage_complete: 0, priority: "p2_high", responsibleKey: "sophie", dueDate: daysFromNow(40), createdBy: owner });

    await insert("initiative_updates", { initiative_id: initId, author_id: owner, completed_summary: "CRM integration complete.", in_progress_summary: "Lead scoring model underway; training materials blocked on resourcing.", next_steps: "Resolve enablement resourcing gap.", blockers: "No dedicated enablement resource.", needs_management_support: true, confidence: "medium" });
  }

  // CR3 Performance Model (deliberately stale — no initiative_updates)
  {
    const initId = initiativeId.get("cr3_model")!;
    const owner = userId.get("sophie")!;
    const m1 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Performance Metrics Definition", weight: 40, status: "active", owner_id: owner, due_date: daysFromNow(10), created_by: owner });
    const m2 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Model Build & Validation", weight: 60, status: "planning", owner_id: owner, due_date: daysFromNow(55), created_by: owner });

    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Define CR3 KPIs", weight: 50, status: "in_progress", percentage_complete: 45, priority: "p3_normal", responsibleKey: "daniel", dueDate: daysFromNow(6), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Historical data audit", weight: 50, status: "in_progress", percentage_complete: 20, priority: "p3_normal", responsibleKey: "daniel", dueDate: daysFromNow(-3), createdBy: owner });
    await addTask({ initiativeId: initId, milestoneId: m2.id, title: "Build predictive model", weight: 100, status: "not_started", percentage_complete: 0, priority: "p3_normal", responsibleKey: "sophie", dueDate: daysFromNow(50), createdBy: owner });
  }

  // Client Portal Revamp (on_hold, minimal)
  {
    const initId = initiativeId.get("client_portal")!;
    const owner = userId.get("liu")!;
    const m1 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Scope & Budget Review", weight: 100, status: "on_hold", owner_id: owner, due_date: daysFromNow(90), created_by: owner });
    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Confirm Q3 budget allocation", weight: 100, status: "not_started", percentage_complete: 0, priority: "p3_normal", responsibleKey: "liu", dueDate: daysFromNow(90), createdBy: owner });
  }

  // Legacy System Decommission (completed)
  {
    const initId = initiativeId.get("legacy_decommission")!;
    const owner = userId.get("aisha")!;
    const m1 = await insert<{ id: string }>("milestones", { initiative_id: initId, name: "Decommission Legacy Scheduler", weight: 100, status: "completed", owner_id: owner, due_date: daysFromNow(-15), created_by: owner });
    await addTask({ initiativeId: initId, milestoneId: m1.id, title: "Archive legacy data & shut down service", weight: 100, status: "completed", percentage_complete: 100, priority: "p4_low", responsibleKey: "aisha", completionDate: daysFromNow(-15), createdBy: owner });
    await insert("initiative_updates", { initiative_id: initId, author_id: owner, completed_summary: "Legacy scheduler fully decommissioned; replaced by MS Scheduler Platform.", confidence: "high" });
  }

  // ------------------------------------------------------------------
  // Issues
  // ------------------------------------------------------------------
  await insertMany("issues", [
    { organization_id: orgId, code: code("ISS"), title: "KPI data source inconsistency", description: "Two upstream systems report conflicting revenue figures.", initiative_id: initiativeId.get("ms_dashboard"), owner_id: userId.get("aisha"), severity: "medium", status: "in_progress", impact: "Dashboard accuracy at risk for leadership reporting.", created_by: userId.get("aisha") },
    { organization_id: orgId, code: code("ISS"), title: "Chatbot latency spikes during peak hours", description: "Response times exceed 4s during peak shopper traffic.", initiative_id: initiativeId.get("shopper_chatbot"), owner_id: userId.get("tom"), severity: "high", status: "open", impact: "Risk of shopper drop-off during high-traffic periods.", created_by: userId.get("tom") },
    { organization_id: orgId, code: code("ISS"), title: "CRM sync data duplication", description: "Duplicate lead records created during initial sync.", initiative_id: initiativeId.get("sales_automation"), owner_id: userId.get("sophie"), severity: "low", status: "resolved", impact: "Minor data cleanup required.", resolution: "De-duplication script run; sync logic patched.", closed_date: daysFromNow(-4), created_by: userId.get("sophie") },
  ]);

  // ------------------------------------------------------------------
  // Risks
  // ------------------------------------------------------------------
  await insertMany("risks", [
    { organization_id: orgId, code: code("RSK"), description: "Vendor API rate limits may delay calendar sync integration.", initiative_id: initiativeId.get("ms_scheduler"), probability: "medium", impact: "high", owner_id: userId.get("aisha"), mitigation: "Escalate vendor access request via account manager.", status: "open", created_by: userId.get("aisha") },
    { organization_id: orgId, code: code("RSK"), description: "NLP model accuracy may be insufficient for edge-case shopper queries.", initiative_id: initiativeId.get("shopper_chatbot"), probability: "medium", impact: "medium", owner_id: userId.get("tom"), mitigation: "Expand training dataset with historical support transcripts.", status: "mitigating", created_by: userId.get("tom") },
    { organization_id: orgId, code: code("RSK"), description: "Sales team resistance to adopting the new automated workflow.", initiative_id: initiativeId.get("sales_automation"), probability: "high", impact: "medium", owner_id: userId.get("rahul"), mitigation: "Run hands-on enablement sessions ahead of rollout.", status: "open", created_by: userId.get("rahul") },
    { organization_id: orgId, code: code("RSK"), description: "Data quality issues could undermine CR3 model validity.", initiative_id: initiativeId.get("cr3_model"), probability: "high", impact: "high", owner_id: userId.get("rahul"), mitigation: "Complete historical data audit before model build.", status: "open", created_by: userId.get("rahul") },
  ]);

  // ------------------------------------------------------------------
  // Decisions (one with a follow-up task)
  // ------------------------------------------------------------------
  await insert("decisions", { organization_id: orgId, code: code("DEC"), title: "Adopt OpenAI-based NLP for chatbot", description: "Standardize on OpenAI models for intent classification instead of building in-house.", decision_date: daysFromNow(-6), decided_by: userId.get("elena"), initiative_id: initiativeId.get("shopper_chatbot"), rationale: "Faster time-to-market and higher baseline accuracy than an in-house model.", status: "approved" });

  const schedulerDecision = await insert<{ id: string }>("decisions", { organization_id: orgId, code: code("DEC"), title: "Delay MS Scheduler pilot by 2 weeks", description: "Pilot onboarding pushed out to allow calendar sync blocker to be resolved.", decision_date: daysFromNow(-2), decided_by: userId.get("marcus"), initiative_id: initiativeId.get("ms_scheduler"), rationale: "Vendor API access blocker makes the original pilot date unachievable.", status: "approved" });
  const m3Scheduler = await admin.from("milestones").select("id").eq("initiative_id", initiativeId.get("ms_scheduler")).eq("name", "Pilot Rollout").single();
  await insert("tasks", { organization_id: orgId, code: code("TASK"), title: "Revise pilot onboarding timeline", initiative_id: initiativeId.get("ms_scheduler"), milestone_id: m3Scheduler.data?.id, priority: "p2_high", status: "not_started", due_date: daysFromNow(20), source_decision_id: schedulerDecision.id, created_by: userId.get("marcus") });

  await insert("decisions", { organization_id: orgId, code: code("DEC"), title: "Expand CR3 model scope to include churn prediction", description: "Proposal to broaden CR3 beyond performance scoring into churn prediction.", decision_date: daysFromNow(0), initiative_id: initiativeId.get("cr3_model"), rationale: "Early signal suggests churn correlates strongly with CR3 inputs.", status: "proposed" });

  // ------------------------------------------------------------------
  // Approvals (milestone-level example)
  // ------------------------------------------------------------------
  const crmMilestone = await admin.from("milestones").select("id").eq("initiative_id", initiativeId.get("sales_automation")).eq("name", "CRM Integration").single();
  if (crmMilestone.data) {
    await insert("approvals", { entity_type: "milestone", entity_id: crmMilestone.data.id, requested_by: userId.get("sophie"), approver_id: userId.get("rahul"), status: "approved", decided_at: new Date().toISOString(), comment: "Looks good, approved." });
  }

  // ------------------------------------------------------------------
  // Strategy review meetings
  // ------------------------------------------------------------------
  const pastMeeting = await insert<{ id: string }>("meetings", {
    organization_id: orgId,
    title: "Weekly Strategy Review",
    meeting_date: daysFromNow(-7),
    status: "completed",
    notes: "Reviewed initiative health across all verticals; approved scheduler pilot delay.",
    summary: "All initiatives on track except CR3 Performance Model (stale) and two open escalations resolved in-session.",
    created_by: userId.get("sarah"),
  });
  await insertMany("meeting_attendees", ["sarah", "david", "priya", "marcus", "elena", "rahul"].map((k) => ({ meeting_id: pastMeeting.id, user_id: userId.get(k), attended: true })));
  await insertMany("meeting_items", [
    { meeting_id: pastMeeting.id, item_type: "health_review", initiative_id: initiativeId.get("ms_dashboard"), title: "MS Dashboard — on track", sort_order: 1 },
    { meeting_id: pastMeeting.id, item_type: "issue", initiative_id: initiativeId.get("ms_scheduler"), title: "Calendar sync vendor blocker", detail: "Escalated to vendor account manager.", sort_order: 2 },
    { meeting_id: pastMeeting.id, item_type: "decision_required", initiative_id: initiativeId.get("ms_scheduler"), title: "Approve 2-week pilot delay", sort_order: 3 },
  ]);

  await insert("meetings", { organization_id: orgId, title: "Weekly Strategy Review", meeting_date: daysFromNow(1), status: "scheduled", created_by: userId.get("sarah") });

  console.log("\nDemo organization seeded successfully.");
  console.log(`Organization: iSN Group (${orgId})`);
  console.log(`All demo users share the password: ${DEMO_PASSWORD}`);
  console.log("Leadership login: sarah.chen@isngroup.demo");
  console.log("Team login: maria.santos@isngroup.demo");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
