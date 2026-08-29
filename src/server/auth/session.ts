import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgLevel, Profile, RoleKey } from "@/types/domain";

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
  roles: RoleKey[];
  permissions: string[];
}

const LEADERSHIP_ROLES: RoleKey[] = ["super_admin", "md_ceo", "director", "business_head"];

/** Loads the current authenticated user's profile, roles and effective permissions. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(key)")
    .eq("user_id", user.id);
  const roles = ((roleRows ?? []) as unknown as { roles: { key: RoleKey } }[]).map((r) => r.roles.key);

  const { data: permRows } = await supabase
    .from("role_permissions")
    .select("permissions(key), roles!inner(user_roles!inner(user_id))")
    .eq("roles.user_roles.user_id", user.id);
  const permissions = Array.from(
    new Set(
      ((permRows ?? []) as unknown as { permissions: { key: string } }[]).map((p) => p.permissions.key)
    )
  );

  return { id: user.id, email: user.email!, profile: profile as Profile, roles, permissions };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function hasRole(user: SessionUser, keys: RoleKey[]) {
  return user.roles.some((r) => keys.includes(r));
}

export function hasPermission(user: SessionUser, key: string) {
  return user.permissions.includes(key);
}

export function isLeadership(user: SessionUser) {
  return hasRole(user, LEADERSHIP_ROLES);
}

export function defaultPortalPath(user: SessionUser) {
  return isLeadership(user) ? "/leadership/command-center" : "/team/my-work";
}

export function orgLevelLabel(level: OrgLevel) {
  switch (level) {
    case "l1_md_ceo":
      return "MD / CEO";
    case "l2_director":
      return "Director";
    case "l3_business_head":
      return "Business Head";
    case "l4_manager":
      return "Manager";
    case "l5_team_lead":
      return "Team Lead";
    case "l6_employee":
      return "Employee";
  }
}
