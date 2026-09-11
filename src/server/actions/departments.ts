"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { formString } from "@/lib/form";
import { createDepartment, updateDepartment } from "@/server/services/departments";

export async function createDepartmentAction(formData: FormData) {
  await requireUser();
  await createDepartment({
    name: formString(formData, "name") ?? "",
    description: formString(formData, "description"),
  });
  revalidatePath("/departments");
}

export async function updateDepartmentAction(id: string, formData: FormData) {
  await requireUser();
  await updateDepartment(id, {
    name: formString(formData, "name") ?? "",
    description: formString(formData, "description"),
  });
  revalidatePath("/departments");
  revalidatePath(`/departments/${id}`);
}
