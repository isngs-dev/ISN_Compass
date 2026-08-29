"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { assignRole } from "@/server/services/admin";

export async function assignRoleAction(formData: FormData) {
  const user = await requireUser();
  await assignRole({
    user_id: String(formData.get("user_id")),
    role_id: String(formData.get("role_id")),
    organization_id: user.profile.organization_id,
    granted_by: user.id,
  });
  revalidatePath("/leadership/admin");
}
