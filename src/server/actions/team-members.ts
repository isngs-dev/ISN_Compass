"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { formString } from "@/lib/form";
import { createTeamMember, updateTeamMember, deleteTeamMember } from "@/server/services/team-members";

export async function createTeamMemberAction(formData: FormData) {
  await requireUser();
  await createTeamMember({
    name: formString(formData, "name") ?? "",
    email: formString(formData, "email") ?? "",
    department_id: formString(formData, "department_id"),
  });
  revalidatePath("/team-members");
}

export async function updateTeamMemberAction(id: string, formData: FormData) {
  await requireUser();
  await updateTeamMember(id, {
    name: formString(formData, "name") ?? "",
    email: formString(formData, "email") ?? "",
    department_id: formString(formData, "department_id") ?? null,
  });
  revalidatePath("/team-members");
}

export async function deactivateTeamMemberAction(id: string) {
  await requireUser();
  await updateTeamMember(id, { is_active: false });
  revalidatePath("/team-members");
}

export async function reactivateTeamMemberAction(id: string) {
  await requireUser();
  await updateTeamMember(id, { is_active: true });
  revalidatePath("/team-members");
}

export async function deleteTeamMemberAction(id: string) {
  await requireUser();
  await deleteTeamMember(id);
  revalidatePath("/team-members");
}
