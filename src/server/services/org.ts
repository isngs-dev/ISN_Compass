import { createClient } from "@/lib/supabase/server";

export async function listOrgMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, title, org_level, department_id, manager_id, avatar_url, is_active")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function listNotifications(userId: string, unreadOnly = false) {
  const supabase = await createClient();
  let query = supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  if (unreadOnly) query = query.eq("is_read", false);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  if (error) throw error;
}
