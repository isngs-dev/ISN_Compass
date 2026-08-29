"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { createTask, updateTaskStatus, addTaskUpdate, delegateTask, setTaskDueDate } from "@/server/services/tasks";
import type { PriorityLevel, TaskStatus } from "@/types/domain";

export async function createTaskAction(
  initiativeId: string,
  formData: FormData,
  opts?: { milestoneId?: string; parentTaskId?: string; redirectPath?: string }
) {
  const user = await requireUser();
  const task = await createTask({
    organization_id: user.profile.organization_id,
    title: String(formData.get("title")),
    description: String(formData.get("description") ?? "") || undefined,
    initiative_id: initiativeId,
    milestone_id: opts?.milestoneId ?? (String(formData.get("milestone_id") ?? "") || undefined),
    parent_task_id: opts?.parentTaskId,
    weight: formData.get("weight") ? Number(formData.get("weight")) : undefined,
    due_date: String(formData.get("due_date") ?? "") || undefined,
    priority: String(formData.get("priority")) as PriorityLevel,
    approval_required: formData.get("approval_required") === "on",
    created_by: user.id,
    responsible_id: String(formData.get("responsible_id") ?? "") || undefined,
  });
  revalidatePath(`/leadership/initiatives/${initiativeId}`);
  revalidatePath("/team/my-work");
  revalidatePath("/team/tasks");
  return task;
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus, percentageComplete?: number) {
  await requireUser();
  await updateTaskStatus(taskId, status, percentageComplete);
  revalidatePath(`/team/tasks/${taskId}`);
  revalidatePath("/team/my-work");
  revalidatePath("/team/tasks");
}

export async function addTaskUpdateAction(taskId: string, formData: FormData) {
  const user = await requireUser();
  await addTaskUpdate({
    task_id: taskId,
    author_id: user.id,
    note: String(formData.get("note")),
    percentage_complete: formData.get("percentage_complete") ? Number(formData.get("percentage_complete")) : undefined,
  });
  revalidatePath(`/team/tasks/${taskId}`);
}

export async function delegateTaskAction(taskId: string, formData: FormData) {
  const user = await requireUser();
  await delegateTask({
    task_id: taskId,
    delegated_by: user.id,
    delegated_to: String(formData.get("delegated_to")),
    delegated_due_date: String(formData.get("delegated_due_date") ?? "") || undefined,
    instructions: String(formData.get("instructions") ?? "") || undefined,
  });
  revalidatePath(`/team/tasks/${taskId}`);
  revalidatePath("/team/delegated");
  revalidatePath("/team/my-work");
}

export async function setTaskDueDateAction(taskId: string, formData: FormData) {
  await requireUser();
  await setTaskDueDate(taskId, String(formData.get("due_date")), String(formData.get("reason")));
  revalidatePath(`/team/tasks/${taskId}`);
}
