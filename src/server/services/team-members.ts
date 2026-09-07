import { createClient } from "@/lib/supabase/server";

const TEAM_MEMBER_SELECT = "*, department:departments(id, name)";

export async function listTeamMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").select(TEAM_MEMBER_SELECT).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getTeamMember(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").select(TEAM_MEMBER_SELECT).eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function getTeamMemberTasks(teamMemberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, initiative:initiatives(id, name)")
    .eq("assigned_to", teamMemberId)
    .order("due_date");
  if (error) throw error;
  return data ?? [];
}

export async function createTeamMember(input: { name: string; email: string; department_id?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateTeamMember(
  id: string,
  input: { name?: string; email?: string; department_id?: string | null; is_active?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").update(input).eq("id", id);
  if (error) throw error;
}

/** Permanent — tasks previously assigned to this member are unassigned (FK on delete set null), not deleted. */
export async function deleteTeamMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}
