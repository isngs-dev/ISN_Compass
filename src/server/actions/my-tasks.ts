"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/server/auth/session";
import { getTask, confirmTaskCompletion } from "@/server/services/tasks";

/** A signed-in member marks one of their own tasks completed — same effect (and Admin email) as the confirm link. */
export async function completeMyTaskAction(taskId: string) {
  const { member } = await requireMember();
  if (!member) throw new Error("Your login no longer has access.");
  const supabase = createAdminClient();
  const task = await getTask(taskId, supabase);
  if (task.assigned_to !== member.id) throw new Error("This task isn't assigned to you.");
  if (task.status === "completed" || task.status === "completion_confirmed") return;
  await confirmTaskCompletion(supabase, task);
  revalidatePath("/my-tasks");
}
