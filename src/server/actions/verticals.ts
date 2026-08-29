"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { createVertical } from "@/server/services/verticals";

export async function createVerticalAction(formData: FormData) {
  const user = await requireUser();
  await createVertical({
    organization_id: user.profile.organization_id,
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    vertical_head_id: String(formData.get("vertical_head_id") ?? "") || undefined,
    created_by: user.id,
  });
  revalidatePath("/leadership/verticals");
}
