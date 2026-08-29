import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/utils/codes";
import type { HealthStatus, InitiativeCategory, InitiativeStatus, MemberRole, PriorityLevel } from "@/types/domain";

export interface InitiativeFilters {
  vertical_id?: string;
  status?: InitiativeStatus;
  health?: HealthStatus;
  priority?: PriorityLevel;
  owner_id?: string;
}

const INITIATIVE_SELECT = `
  *,
  business_vertical:business_verticals(id, name),
  strategic_goal:strategic_goals!initiatives_strategic_goal_id_fkey(id, name),
  members:initiative_members(id, member_role, user:profiles!initiative_members_user_id_fkey(id, full_name, avatar_url))
`;

export async function listInitiatives(filters: InitiativeFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("initiatives").select(INITIATIVE_SELECT).is("deleted_at", null);

  if (filters.vertical_id) query = query.eq("business_vertical_id", filters.vertical_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.health) query = query.eq("health", filters.health);
  if (filters.priority) query = query.eq("priority", filters.priority);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;

  if (filters.owner_id) {
    return (data ?? []).filter((i) =>
      (i.members ?? []).some(
        (m: { member_role: MemberRole; user: { id: string } }) =>
          m.member_role === "accountable_owner" && m.user?.id === filters.owner_id
      )
    );
  }
  return data ?? [];
}

export async function getInitiative(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("initiatives").select(INITIATIVE_SELECT).eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function getInitiativeMilestones(initiativeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("milestones")
    .select("*, owner:profiles!milestones_owner_id_fkey(id, full_name)")
    .eq("initiative_id", initiativeId)
    .is("deleted_at", null)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getInitiativeTasks(initiativeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, assignments:task_assignments(id, assignment_role, user:profiles!task_assignments_user_id_fkey(id, full_name))"
    )
    .eq("initiative_id", initiativeId)
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function getInitiativeUpdates(initiativeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("initiative_updates")
    .select("*, author:profiles(id, full_name, avatar_url)")
    .eq("initiative_id", initiativeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInitiativeAuditLog(initiativeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, actor:profiles(id, full_name)")
    .eq("entity_type", "initiative")
    .eq("entity_id", initiativeId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export interface CreateInitiativeInput {
  organization_id: string;
  name: string;
  description?: string;
  business_vertical_id: string;
  strategic_goal_id?: string;
  category: InitiativeCategory;
  strategic_objective?: string;
  priority: PriorityLevel;
  start_date?: string;
  target_completion_date?: string;
  budget?: number;
  revenue_opportunity?: number;
  cost_saving_opportunity?: number;
  visibility?: string;
  confidentiality?: string;
  created_by: string;
  accountable_owner_id: string;
  executive_sponsor_id?: string;
  responsible_manager_id?: string;
}

export async function createInitiative(input: CreateInitiativeInput) {
  const supabase = await createClient();
  const {
    accountable_owner_id,
    executive_sponsor_id,
    responsible_manager_id,
    ...initiativeFields
  } = input;

  const { data: initiative, error } = await supabase
    .from("initiatives")
    .insert({ ...initiativeFields, code: generateCode("INIT"), status: "planning" })
    .select()
    .single();
  if (error) throw error;

  const members: { initiative_id: string; user_id: string; member_role: MemberRole; assigned_by: string }[] = [
    {
      initiative_id: initiative.id,
      user_id: accountable_owner_id,
      member_role: "accountable_owner",
      assigned_by: input.created_by,
    },
  ];
  if (executive_sponsor_id) {
    members.push({
      initiative_id: initiative.id,
      user_id: executive_sponsor_id,
      member_role: "executive_sponsor",
      assigned_by: input.created_by,
    });
  }
  if (responsible_manager_id) {
    members.push({
      initiative_id: initiative.id,
      user_id: responsible_manager_id,
      member_role: "responsible_manager",
      assigned_by: input.created_by,
    });
  }

  const { error: memberError } = await supabase.from("initiative_members").insert(members);
  if (memberError) throw memberError;

  await supabase.from("audit_logs").insert({
    organization_id: input.organization_id,
    entity_type: "initiative",
    entity_id: initiative.id,
    action: "created",
    actor_id: input.created_by,
    new_value: { name: input.name, accountable_owner_id },
  });

  return initiative;
}

export async function assignInitiativeAccountableOwner(
  initiativeId: string,
  newOwnerId: string,
  actorId: string,
  organizationId: string
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("initiative_members")
    .select("id, user_id")
    .eq("initiative_id", initiativeId)
    .eq("member_role", "accountable_owner")
    .maybeSingle();

  if (existing) {
    await supabase.from("initiative_members").delete().eq("id", existing.id);
  }

  const { error } = await supabase.from("initiative_members").insert({
    initiative_id: initiativeId,
    user_id: newOwnerId,
    member_role: "accountable_owner",
    assigned_by: actorId,
  });
  if (error) throw error;

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    entity_type: "initiative",
    entity_id: initiativeId,
    action: "owner_changed",
    actor_id: actorId,
    previous_value: existing ? { accountable_owner_id: existing.user_id } : null,
    new_value: { accountable_owner_id: newOwnerId },
  });
}

export async function submitInitiativeUpdate(input: {
  initiative_id: string;
  author_id: string;
  completed_summary?: string;
  in_progress_summary?: string;
  next_steps?: string;
  blockers?: string;
  needs_management_support: boolean;
  confidence: "high" | "medium" | "low";
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("initiative_updates").insert(input);
  if (error) throw error;
}

export async function overrideInitiativeHealth(initiativeId: string, health: HealthStatus, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("override_initiative_health", {
    p_initiative_id: initiativeId,
    p_health: health,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function clearInitiativeHealthOverride(initiativeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_initiative_health_override", {
    p_initiative_id: initiativeId,
  });
  if (error) throw error;
}
