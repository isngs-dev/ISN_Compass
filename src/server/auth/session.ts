import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
}

/** There is exactly one user: the Admin. Any authenticated session is the Admin. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email! };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
