"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { createTeamMember, updateTeamMember, deleteTeamMember } from "@/server/services/team-members";

export async function createTeamMemberAction(formData: FormData) {
  await requireUser();
  await createTeamMember({
    name: String(formData.get("name")),
    email: String(formData.get("email")),
    department_id: String(formData.get("department_id") ?? "") || undefined,
  });
  revalidatePath("/team-members");
}

export async function updateTeamMemberAction(id: string, formData: FormData) {
  await requireUser();
  await updateTeamMember(id, {
    name: String(formData.get("name")),
    email: String(formData.get("email")),
    department_id: String(formData.get("department_id") ?? "") || null,
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
