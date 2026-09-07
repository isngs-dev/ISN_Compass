"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTaskByConfirmationToken, confirmTaskCompletion } from "@/server/services/tasks";

/** Public — reached only via the no-login email link. Not gated by requireUser(). */
export async function confirmTaskAction(token: string) {
  const supabase = createAdminClient();
  const task = await getTaskByConfirmationToken(supabase, token);
  if (!task) return { ok: false as const, message: "This link is invalid or has expired." };
  if (task.status === "completion_confirmed" || task.status === "completed") {
    return { ok: true as const, alreadyConfirmed: true, task };
  }
  await confirmTaskCompletion(supabase, task);
  return { ok: true as const, alreadyConfirmed: false, task };
}
