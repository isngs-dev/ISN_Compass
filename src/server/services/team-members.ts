import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

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

/** Pass the service-role client for member flows (members have no RLS access). */
export async function getTeamMemberTasks(teamMemberId: string, supabase?: SupabaseClient<Database>) {
  supabase ??= await createClient();
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
  await revokeTeamMemberLogin(id);
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Member logins — created by the Admin. Auth users can only be created with the
// service role; callers must already have checked requireAdmin().
// ---------------------------------------------------------------------------

/** Creates the member's login, or changes its username / password (blank password = keep). */
export async function setTeamMemberLogin(id: string, username: string, password?: string) {
  const supabase = await createClient();
  const member = await getTeamMember(id);

  // Username first: its unique constraint is the check that can fail, and nothing
  // has been created in Auth yet if it does.
  const { error: usernameError } = await supabase.from("team_members").update({ username }).eq("id", id);
  if (usernameError) {
    throw new Error(usernameError.code === "23505" ? "That username is already taken." : usernameError.message);
  }

  const auth = createAdminClient().auth.admin;
  if (member.user_id) {
    if (password) {
      const { error } = await auth.updateUserById(member.user_id, { password });
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (!password) throw new Error("Set a password to create the login.");
  const { data, error } = await auth.createUser({
    email: member.email,
    password,
    email_confirm: true,
    app_metadata: { role: "member" },
  });
  if (error) throw new Error(error.message);
  const { error: linkError } = await supabase.from("team_members").update({ user_id: data.user.id }).eq("id", id);
  if (linkError) {
    await auth.deleteUser(data.user.id);
    throw linkError;
  }
}

export async function revokeTeamMemberLogin(id: string) {
  const member = await getTeamMember(id);
  if (!member.user_id) return;
  const { error } = await createAdminClient().auth.admin.deleteUser(member.user_id);
  if (error) throw new Error(error.message);
  // user_id is cleared by the FK (on delete set null); clear the username too.
  const supabase = await createClient();
  const { error: clearError } = await supabase.from("team_members").update({ username: null, user_id: null }).eq("id", id);
  if (clearError) throw clearError;
}

/** Login-by-username: resolves to the email on the member's auth user. Public (sign-in form), service role. */
export async function emailForUsername(username: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("team_members").select("user_id").eq("username", username).maybeSingle();
  if (!data?.user_id) return null;
  const { data: auth } = await supabase.auth.admin.getUserById(data.user_id);
  return auth.user?.email ?? null;
}
