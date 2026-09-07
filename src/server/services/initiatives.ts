import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/server/services/activity";
import type { InitiativeStatus } from "@/types/database";

const INITIATIVE_SELECT = "*, department:departments(id, name)";

export interface InitiativeFilters {
  department_id?: string;
  status?: InitiativeStatus;
  includeArchived?: boolean;
}

export async function listInitiatives(filters: InitiativeFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("initiatives").select(INITIATIVE_SELECT);
  if (!filters.includeArchived) query = query.eq("is_archived", false);
  if (filters.department_id) query = query.eq("department_id", filters.department_id);
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInitiative(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("initiatives").select(INITIATIVE_SELECT).eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function getInitiativeTasks(initiativeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:team_members(id, name, email)")
    .eq("initiative_id", initiativeId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Activity for the initiative itself plus every task under it. */
export async function getInitiativeActivity(initiativeId: string) {
  const supabase = await createClient();
  const { data: tasks } = await supabase.from("tasks").select("id").eq("initiative_id", initiativeId);
  const taskIds = (tasks ?? []).map((t) => t.id);

  const orFilter = [`entity_id.eq.${initiativeId}`, ...taskIds.map((id) => `entity_id.eq.${id}`)].join(",");
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .or(orFilter)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface CreateInitiativeInput {
  name: string;
  description?: string;
  department_id: string;
  start_date?: string;
  target_date?: string;
}

export async function createInitiative(input: CreateInitiativeInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("initiatives").insert(input).select().single();
  if (error) throw error;
  await logActivity(supabase, {
    entity_type: "initiative",
    entity_id: data.id,
    action: "initiative_created",
    description: `Initiative "${data.name}" created`,
  });
  return data;
}

export async function updateInitiative(
  id: string,
  input: {
    name?: string;
    description?: string;
    department_id?: string;
    start_date?: string | null;
    target_date?: string | null;
    status?: InitiativeStatus;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("initiatives").update(input).eq("id", id);
  if (error) throw error;
  if (input.status) {
    await logActivity(supabase, {
      entity_type: "initiative",
      entity_id: id,
      action: "initiative_status_changed",
      description: `Status changed to "${input.status.replace(/_/g, " ")}"`,
    });
  }
}

export async function setInitiativeArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("initiatives").update({ is_archived: archived }).eq("id", id);
  if (error) throw error;
  await logActivity(supabase, {
    entity_type: "initiative",
    entity_id: id,
    action: archived ? "initiative_archived" : "initiative_unarchived",
    description: archived ? "Initiative archived" : "Initiative unarchived",
  });
}
