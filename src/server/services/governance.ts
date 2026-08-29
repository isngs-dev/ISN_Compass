import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/utils/codes";
import type {
  EscalationCategory,
  EscalationLevel,
  IssueSeverity,
  RiskImpact,
  RiskProbability,
} from "@/types/domain";

// ---------------- Issues ----------------
export async function listIssues() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select("*, initiative:initiatives(id, name, code), owner:profiles!issues_owner_id_fkey(id, full_name)")
    .order("date_raised", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createIssue(input: {
  organization_id: string;
  title: string;
  description?: string;
  initiative_id?: string;
  task_id?: string;
  owner_id?: string;
  severity: IssueSeverity;
  impact?: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("issues").insert({ ...input, code: generateCode("ISS") });
  if (error) throw error;
}

// ---------------- Risks ----------------
export async function listRisks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("risks")
    .select("*, initiative:initiatives(id, name, code), owner:profiles!risks_owner_id_fkey(id, full_name)")
    .order("risk_score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRisk(input: {
  organization_id: string;
  description: string;
  initiative_id?: string;
  probability: RiskProbability;
  impact: RiskImpact;
  owner_id?: string;
  mitigation?: string;
  contingency?: string;
  review_date?: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("risks").insert({ ...input, code: generateCode("RSK") });
  if (error) throw error;
}

// ---------------- Decisions ----------------
export async function listDecisions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select("*, initiative:initiatives(id, name, code), decided_by_profile:profiles!decisions_decided_by_fkey(id, full_name), meeting:meetings(id, title, meeting_date)")
    .order("decision_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createDecision(input: {
  organization_id: string;
  title: string;
  description?: string;
  decided_by?: string;
  initiative_id?: string;
  meeting_id?: string;
  rationale?: string;
  status: "proposed" | "approved" | "rejected" | "deferred" | "superseded";
  review_date?: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .insert({ ...input, code: generateCode("DEC") })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Decision creates a follow-up task (spec §22, §52 step 19). */
export async function createFollowUpTaskFromDecision(input: {
  decision_id: string;
  organization_id: string;
  initiative_id: string;
  title: string;
  description?: string;
  due_date?: string;
  responsible_id?: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: input.organization_id,
      code: generateCode("TASK"),
      title: input.title,
      description: input.description,
      initiative_id: input.initiative_id,
      due_date: input.due_date,
      priority: "p2_high",
      status: "not_started",
      source_decision_id: input.decision_id,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.responsible_id) {
    await supabase.from("task_assignments").insert({
      task_id: task.id,
      user_id: input.responsible_id,
      assignment_role: "responsible",
      assigned_by: input.created_by,
    });
  }
  return task;
}

// ---------------- Escalations ----------------
export async function listEscalations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("escalations")
    .select(
      "*, initiative:initiatives(id, name, code), raised_by_profile:profiles!escalations_raised_by_fkey(id, full_name), assigned_to_profile:profiles!escalations_assigned_to_fkey(id, full_name)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createEscalation(input: {
  organization_id: string;
  title: string;
  description?: string;
  initiative_id?: string;
  task_id?: string;
  category: EscalationCategory;
  level: EscalationLevel;
  raised_by: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("escalations").insert({ ...input, code: generateCode("ESC") });
  if (error) throw error;
}

export async function resolveEscalation(id: string, resolutionNote: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("escalations")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_note: resolutionNote })
    .eq("id", id);
  if (error) throw error;
}

// ---------------- Approvals ----------------
export async function listApprovalsForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("*, requested_by_profile:profiles!approvals_requested_by_fkey(id, full_name)")
    .eq("approver_id", userId)
    .order("requested_at", { ascending: false });
  if (error) throw error;

  const taskIds = (data ?? []).filter((a) => a.entity_type === "task").map((a) => a.entity_id);
  const milestoneIds = (data ?? []).filter((a) => a.entity_type === "milestone").map((a) => a.entity_id);
  const [{ data: tasks }, { data: milestones }] = await Promise.all([
    taskIds.length ? supabase.from("tasks").select("id, title, code").in("id", taskIds) : Promise.resolve({ data: [] }),
    milestoneIds.length ? supabase.from("milestones").select("id, name").in("id", milestoneIds) : Promise.resolve({ data: [] }),
  ]);
  const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]));
  const milestoneMap = new Map((milestones ?? []).map((m) => [m.id, m]));

  return (data ?? []).map((a) => ({
    ...a,
    entity_label:
      a.entity_type === "task" ? taskMap.get(a.entity_id)?.title : milestoneMap.get(a.entity_id)?.name,
  }));
}

export async function decideApproval(id: string, status: "approved" | "rejected" | "changes_requested", comment?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("approvals")
    .update({ status, comment, decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
