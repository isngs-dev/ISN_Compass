"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { createInitiative, updateInitiative, setInitiativeArchived } from "@/server/services/initiatives";
import type { InitiativeStatus } from "@/types/database";

export async function createInitiativeAction(formData: FormData) {
  await requireUser();
  const initiative = await createInitiative({
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    department_id: String(formData.get("department_id")),
    start_date: String(formData.get("start_date") ?? "") || undefined,
    target_date: String(formData.get("target_date") ?? "") || undefined,
  });
  revalidatePath("/initiatives");
  redirect(`/initiatives/${initiative.id}`);
}

export async function updateInitiativeAction(id: string, formData: FormData) {
  await requireUser();
  await updateInitiative(id, {
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    department_id: String(formData.get("department_id")),
    start_date: String(formData.get("start_date") ?? "") || null,
    target_date: String(formData.get("target_date") ?? "") || null,
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
