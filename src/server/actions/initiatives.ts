"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  createInitiative,
  overrideInitiativeHealth,
  clearInitiativeHealthOverride,
  submitInitiativeUpdate,
  assignInitiativeAccountableOwner,
} from "@/server/services/initiatives";
import type { HealthStatus, InitiativeCategory, PriorityLevel, ConfidenceLevel } from "@/types/domain";

export async function createInitiativeAction(formData: FormData) {
  const user = await requireUser();
  const initiative = await createInitiative({
    organization_id: user.profile.organization_id,
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    business_vertical_id: String(formData.get("business_vertical_id")),
    strategic_goal_id: String(formData.get("strategic_goal_id") ?? "") || undefined,
    category: String(formData.get("category")) as InitiativeCategory,
    strategic_objective: String(formData.get("strategic_objective") ?? "") || undefined,
    priority: String(formData.get("priority")) as PriorityLevel,
    start_date: String(formData.get("start_date") ?? "") || undefined,
    target_completion_date: String(formData.get("target_completion_date") ?? "") || undefined,
    budget: formData.get("budget") ? Number(formData.get("budget")) : undefined,
    revenue_opportunity: formData.get("revenue_opportunity") ? Number(formData.get("revenue_opportunity")) : undefined,
    cost_saving_opportunity: formData.get("cost_saving_opportunity") ? Number(formData.get("cost_saving_opportunity")) : undefined,
    created_by: user.id,
    accountable_owner_id: String(formData.get("accountable_owner_id")),
    executive_sponsor_id: String(formData.get("executive_sponsor_id") ?? "") || undefined,
    responsible_manager_id: String(formData.get("responsible_manager_id") ?? "") || undefined,
  });
  revalidatePath("/leadership/initiatives");
  redirect(`/leadership/initiatives/${initiative.id}`);
}

export async function reassignOwnerAction(initiativeId: string, formData: FormData) {
  const user = await requireUser();
  await assignInitiativeAccountableOwner(
    initiativeId,
    String(formData.get("owner_id")),
    user.id,
    user.profile.organization_id
  );
  revalidatePath(`/leadership/initiatives/${initiativeId}`);
}

export async function overrideHealthAction(initiativeId: string, formData: FormData) {
  await requireUser();
  await overrideInitiativeHealth(initiativeId, String(formData.get("health")) as HealthStatus, String(formData.get("reason")));
  revalidatePath(`/leadership/initiatives/${initiativeId}`);
}

export async function clearHealthOverrideAction(initiativeId: string) {
  await requireUser();
  await clearInitiativeHealthOverride(initiativeId);
  revalidatePath(`/leadership/initiatives/${initiativeId}`);
}

export async function submitInitiativeUpdateAction(initiativeId: string, formData: FormData) {
  const user = await requireUser();
  await submitInitiativeUpdate({
    initiative_id: initiativeId,
    author_id: user.id,
    completed_summary: String(formData.get("completed_summary") ?? "") || undefined,
    in_progress_summary: String(formData.get("in_progress_summary") ?? "") || undefined,
    next_steps: String(formData.get("next_steps") ?? "") || undefined,
    blockers: String(formData.get("blockers") ?? "") || undefined,
    needs_management_support: formData.get("needs_management_support") === "on",
    confidence: String(formData.get("confidence")) as ConfidenceLevel,
  });
  revalidatePath(`/leadership/initiatives/${initiativeId}`);
}
