import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SessionUser {
  id: string;
  email: string;
  role: "admin" | "member";
}

/**
 * The Admin is the auth user with app_metadata.role = "admin" (see migration 0006).
 * Anyone else is a team member whose login the Admin created. app_metadata is only
 * writable with the service role, so a user can't promote themselves.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email!, role: user.app_metadata?.role === "admin" ? "admin" : "member" };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/my-tasks");
  return user;
}

/** Members have no RLS access; their pages go through the service-role client scoped to this row. */
export async function requireMember() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/dashboard");
  const { data: member, error } = await createAdminClient()
    .from("team_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  // Null when the login was revoked mid-session; inactive when the member was deactivated.
  return { user, member: member?.is_active ? member : null };
}
