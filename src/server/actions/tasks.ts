"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { formString } from "@/lib/form";
import {
  createTask,
  updateTask,
  addTaskNote,
  reassignTask,
  setTaskStatus,
  markTaskCompleted,
  reopenTask,
  deleteTask,
} from "@/server/services/tasks";
import { listActivityForEntity } from "@/server/services/activity";
import type { TaskPriority, TaskStatus } from "@/types/database";

export async function createTaskAction(initiativeId: string, formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
  await updateTask(taskId, {
    name: formString(formData, "name") ?? "",
    description: formString(formData, "description"),
    priority: formString(formData, "priority") as TaskPriority | undefined,
    start_date: formString(formData, "start_date") ?? null,
    due_date: formString(formData, "due_date") ?? null,
  });

  const status = formString(formData, "status") as TaskStatus | undefined;
  if (status) await setTaskStatus(taskId, status);

  const note = formString(formData, "note");
  if (note) await addTaskNote(taskId, note);

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function reassignTaskAction(taskId: string, initiativeId: string, formData: FormData) {
  await requireAdmin();
  const assignedTo = formString(formData, "assigned_to");
  if (!assignedTo) throw new Error("Choose a team member to assign this task to.");
  await reassignTask(taskId, assignedTo, formString(formData, "assignment_note"));
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function setTaskStatusAction(taskId: string, initiativeId: string, status: TaskStatus) {
  await requireAdmin();
  await setTaskStatus(taskId, status);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function markTaskCompletedAction(taskId: string, initiativeId: string) {
  await requireAdmin();
  await markTaskCompleted(taskId);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function reopenTaskAction(taskId: string, initiativeId: string) {
  await requireAdmin();
  await reopenTask(taskId);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(taskId: string, initiativeId: string) {
  await requireAdmin();
  await deleteTask(taskId);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function getTaskActivityAction(taskId: string) {
  await requireAdmin();
  return listActivityForEntity("task", taskId);
}
