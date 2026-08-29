"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { createGoal } from "@/server/services/goals";

export async function createGoalAction(formData: FormData) {
  const user = await requireUser();
  await createGoal({
    organization_id: user.profile.organization_id,
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    period: String(formData.get("period")),
    owner_id: String(formData.get("owner_id") ?? "") || undefined,
    target: String(formData.get("target") ?? "") || undefined,
    business_vertical_id: String(formData.get("business_vertical_id") ?? "") || undefined,
    created_by: user.id,
  });
  revalidatePath("/leadership/goals");
}
