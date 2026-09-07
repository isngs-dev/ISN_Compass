"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { createDepartment, updateDepartment } from "@/server/services/departments";

export async function createDepartmentAction(formData: FormData) {
  await requireUser();
  await createDepartment({
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
  });
  revalidatePath("/departments");
}

export async function updateDepartmentAction(id: string, formData: FormData) {
  await requireUser();
  await updateDepartment(id, {
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
  });
  revalidatePath("/departments");
  revalidatePath(`/departments/${id}`);
}
