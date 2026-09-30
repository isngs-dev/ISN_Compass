"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { formString } from "@/lib/form";
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  setTeamMemberLogin,
  revokeTeamMemberLogin,
} from "@/server/services/team-members";

export async function createTeamMemberAction(formData: FormData) {
  await requireAdmin();
  await createTeamMember({
    name: formString(formData, "name") ?? "",
    email: formString(formData, "email") ?? "",
    department_id: formString(formData, "department_id"),
  });
  revalidatePath("/team-members");
}

export async function updateTeamMemberAction(id: string, formData: FormData) {
  await requireAdmin();
  await updateTeamMember(id, {
    name: formString(formData, "name") ?? "",
    email: formString(formData, "email") ?? "",
    department_id: formString(formData, "department_id") ?? null,
  });
  revalidatePath("/team-members");
}

export async function deactivateTeamMemberAction(id: string) {
  await requireAdmin();
  await updateTeamMember(id, { is_active: false });
  revalidatePath("/team-members");
}

export async function reactivateTeamMemberAction(id: string) {
  await requireAdmin();
  await updateTeamMember(id, { is_active: true });
  revalidatePath("/team-members");
}

export async function deleteTeamMemberAction(id: string) {
  await requireAdmin();
  await deleteTeamMember(id);
  revalidatePath("/team-members");
}

export async function setTeamMemberLoginAction(id: string, formData: FormData) {
  await requireAdmin();
  const username = formString(formData, "username");
  if (!username) throw new Error("Username is required.");
  if (/[@\s]/.test(username)) throw new Error("Username can't contain spaces or @.");
  await setTeamMemberLogin(id, username, formString(formData, "password"));
  revalidatePath(`/team-members/${id}`);
}

export async function revokeTeamMemberLoginAction(id: string) {
  await requireAdmin();
  await revokeTeamMemberLogin(id);
  revalidatePath(`/team-members/${id}`);
}
