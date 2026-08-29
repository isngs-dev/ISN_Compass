"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { createMilestone, updateMilestoneStatus } from "@/server/services/milestones";
import type { PriorityLevel } from "@/types/domain";

export async function createMilestoneAction(initiativeId: string, formData: FormData) {
  const user = await requireUser();
  await createMilestone({
    initiative_id: initiativeId,
    organization_id: user.profile.organization_id,
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    owner_id: String(formData.get("owner_id") ?? "") || undefined,
    due_date: String(formData.get("due_date") ?? "") || undefined,
    weight: Number(formData.get("weight") ?? 0),
    priority: String(formData.get("priority")) as PriorityLevel,
    approval_required: formData.get("approval_required") === "on",
    created_by: user.id,
  });
  revalidatePath(`/leadership/initiatives/${initiativeId}`);
}

export async function updateMilestoneStatusAction(initiativeId: string, milestoneId: string, status: string) {
  const user = await requireUser();
  await updateMilestoneStatus(milestoneId, status, user.id, user.profile.organization_id);
  revalidatePath(`/leadership/initiatives/${initiativeId}`);
}
