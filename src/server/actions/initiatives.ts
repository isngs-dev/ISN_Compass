"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { formString } from "@/lib/form";
import { createInitiative, updateInitiative, setInitiativeArchived, deleteInitiative } from "@/server/services/initiatives";
import type { InitiativeStatus } from "@/types/database";

export async function createInitiativeAction(formData: FormData) {
  await requireUser();
  const departmentId = formString(formData, "department_id");
  if (!departmentId) throw new Error("Choose a department.");
  const initiative = await createInitiative({
    name: formString(formData, "name") ?? "",
    description: formString(formData, "description"),
    department_id: departmentId,
    start_date: formString(formData, "start_date"),
    target_date: formString(formData, "target_date"),
  });
  revalidatePath("/initiatives");
  redirect(`/initiatives/${initiative.id}`);
}

export async function updateInitiativeAction(id: string, formData: FormData) {
  await requireUser();
  const departmentId = formString(formData, "department_id");
  if (!departmentId) throw new Error("Choose a department.");
  await updateInitiative(id, {
    name: formString(formData, "name") ?? "",
    description: formString(formData, "description"),
    department_id: departmentId,
    start_date: formString(formData, "start_date") ?? null,
    target_date: formString(formData, "target_date") ?? null,
  });
  revalidatePath(`/initiatives/${id}`);
}

export async function setInitiativeStatusAction(id: string, status: InitiativeStatus) {
  await requireUser();
  await updateInitiative(id, { status });
  revalidatePath(`/initiatives/${id}`);
  revalidatePath("/initiatives");
}

export async function archiveInitiativeAction(id: string) {
  await requireUser();
  await setInitiativeArchived(id, true);
  revalidatePath(`/initiatives/${id}`);
  revalidatePath("/initiatives");
}

export async function unarchiveInitiativeAction(id: string) {
  await requireUser();
  await setInitiativeArchived(id, false);
  revalidatePath(`/initiatives/${id}`);
  revalidatePath("/initiatives");
}

export async function deleteInitiativeAction(id: string) {
  await requireUser();
  await deleteInitiative(id);
  revalidatePath("/initiatives");
  revalidatePath("/dashboard");
}
