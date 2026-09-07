import { createClient } from "@/lib/supabase/server";

export async function listDepartments() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getDepartment(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function getDepartmentTeamMembers(departmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("department_id", departmentId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createDepartment(input: { name: string; description?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateDepartment(
  id: string,
  input: { name?: string; description?: string; is_active?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").update(input).eq("id", id);
  if (error) throw error;
}
