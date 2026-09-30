"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailForUsername } from "@/server/services/team-members";

export async function signInAction(formData: FormData) {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  // Admin signs in by email; team members by the username the Admin gave them.
  const email = identifier.includes("@") ? identifier : await emailForUsername(identifier);

  const supabase = await createClient();
  const { error } = email
    ? await supabase.auth.signInWithPassword({ email, password })
    : { error: { message: "Invalid login credentials" } };
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next && next !== "/" ? next : "/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
