"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import {
  createIssue,
  createRisk,
  createDecision,
  createFollowUpTaskFromDecision,
  createEscalation,
  resolveEscalation,
  decideApproval,
} from "@/server/services/governance";
import type { EscalationCategory, EscalationLevel, IssueSeverity, RiskImpact, RiskProbability } from "@/types/domain";

export async function createIssueAction(formData: FormData) {
  const user = await requireUser();
  await createIssue({
    organization_id: user.profile.organization_id,
    title: String(formData.get("title")),
    description: String(formData.get("description") ?? "") || undefined,
    initiative_id: String(formData.get("initiative_id") ?? "") || undefined,
    owner_id: String(formData.get("owner_id") ?? "") || undefined,
    severity: String(formData.get("severity")) as IssueSeverity,
    impact: String(formData.get("impact") ?? "") || undefined,
    created_by: user.id,
  });
  revalidatePath("/leadership/issues-risks");
}

export async function createRiskAction(formData: FormData) {
  const user = await requireUser();
  await createRisk({
    organization_id: user.profile.organization_id,
    description: String(formData.get("description")),
    initiative_id: String(formData.get("initiative_id") ?? "") || undefined,
    probability: String(formData.get("probability")) as RiskProbability,
    impact: String(formData.get("impact")) as RiskImpact,
    owner_id: String(formData.get("owner_id") ?? "") || undefined,
    mitigation: String(formData.get("mitigation") ?? "") || undefined,
    contingency: String(formData.get("contingency") ?? "") || undefined,
    review_date: String(formData.get("review_date") ?? "") || undefined,
    created_by: user.id,
  });
  revalidatePath("/leadership/issues-risks");
}

export async function createDecisionAction(formData: FormData) {
  const user = await requireUser();
  const followUpTitle = String(formData.get("follow_up_task_title") ?? "");
  const initiativeId = String(formData.get("initiative_id") ?? "") || undefined;

  const decision = await createDecision({
    organization_id: user.profile.organization_id,
    title: String(formData.get("title")),
    description: String(formData.get("description") ?? "") || undefined,
    decided_by: user.id,
    initiative_id: initiativeId,
    rationale: String(formData.get("rationale") ?? "") || undefined,
    status: (String(formData.get("status") ?? "approved")) as "proposed" | "approved" | "rejected" | "deferred" | "superseded",
    review_date: String(formData.get("review_date") ?? "") || undefined,
    created_by: user.id,
  });

  if (followUpTitle && initiativeId) {
    await createFollowUpTaskFromDecision({
      decision_id: decision.id,
      organization_id: user.profile.organization_id,
      initiative_id: initiativeId,
      title: followUpTitle,
      due_date: String(formData.get("follow_up_due_date") ?? "") || undefined,
      responsible_id: String(formData.get("follow_up_responsible_id") ?? "") || undefined,
      created_by: user.id,
    });
  }

  revalidatePath("/leadership/decisions");
}

export async function createEscalationAction(formData: FormData) {
  const user = await requireUser();
  await createEscalation({
    organization_id: user.profile.organization_id,
    title: String(formData.get("title")),
    description: String(formData.get("description") ?? "") || undefined,
    initiative_id: String(formData.get("initiative_id") ?? "") || undefined,
    task_id: String(formData.get("task_id") ?? "") || undefined,
    category: String(formData.get("category")) as EscalationCategory,
    level: String(formData.get("level")) as EscalationLevel,
    raised_by: user.id,
  });
  revalidatePath("/leadership/escalations");
  revalidatePath("/team/blockers");
}

export async function resolveEscalationAction(id: string, formData: FormData) {
  await requireUser();
  await resolveEscalation(id, String(formData.get("resolution_note") ?? ""));
  revalidatePath("/leadership/escalations");
  revalidatePath("/team/blockers");
}

export async function decideApprovalAction(id: string, status: "approved" | "rejected" | "changes_requested", comment?: string) {
  await requireUser();
  await decideApproval(id, status, comment);
  revalidatePath("/team/approvals");
}
