import { createClient } from "@/lib/supabase/server";

export async function listRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("*").order("rank");
  if (error) throw error;
  return data ?? [];
}

export interface MemberWithRoles {
  id: string;
  full_name: string;
  email: string;
  title: string | null;
  org_level: string;
  is_active: boolean;
  manager: { id: string; full_name: string } | null;
  roles: { role: { id: string; key: string; name: string } | null }[];
}

export async function listMembersWithRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, title, org_level, is_active, manager:profiles!manager_id(id, full_name), roles:user_roles!user_roles_user_id_fkey(role:roles(id, key, name))")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as unknown as MemberWithRoles[];
}

export async function assignRole(input: { user_id: string; role_id: string; organization_id: string; granted_by: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").upsert(input, { onConflict: "user_id,role_id" });
  if (error) throw error;
}
