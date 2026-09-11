"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { formString } from "@/lib/form";
import {
  createTask,
  updateTask,
  reassignTask,
  setTaskStatus,
  markTaskCompleted,
  reopenTask,
  deleteTask,
} from "@/server/services/tasks";
import type { TaskPriority, TaskStatus } from "@/types/database";

export async function createTaskAction(initiativeId: string, formData: FormData) {
  await requireUser();
  await createTask({
    initiative_id: initiativeId,
    name: formString(formData, "name") ?? "",
    description: formString(formData, "description"),
    assigned_to: formString(formData, "assigned_to"),
    assignment_note: formString(formData, "assignment_note"),
    priority: (formString(formData, "priority") ?? "medium") as TaskPriority,
    start_date: formString(formData, "start_date"),
    due_date: formString(formData, "due_date"),
  });
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function updateTaskAction(taskId: string, initiativeId: string, formData: FormData) {
  await requireUser();
  await updateTask(taskId, {
    name: formString(formData, "name") ?? "",
    description: formString(formData, "description"),
    priority: formString(formData, "priority") as TaskPriority | undefined,
    start_date: formString(formData, "start_date") ?? null,
    due_date: formString(formData, "due_date") ?? null,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function reassignTaskAction(taskId: string, initiativeId: string, formData: FormData) {
  await requireUser();
  const assignedTo = formString(formData, "assigned_to");
  if (!assignedTo) throw new Error("Choose a team member to assign this task to.");
  await reassignTask(taskId, assignedTo, formString(formData, "assignment_note"));
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function setTaskStatusAction(taskId: string, initiativeId: string, status: TaskStatus) {
  await requireUser();
  await setTaskStatus(taskId, status);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function markTaskCompletedAction(taskId: string, initiativeId: string) {
  await requireUser();
  await markTaskCompleted(taskId);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function reopenTaskAction(taskId: string, initiativeId: string) {
  await requireUser();
  await reopenTask(taskId);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(taskId: string, initiativeId: string) {
  await requireUser();
  await deleteTask(taskId);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}
