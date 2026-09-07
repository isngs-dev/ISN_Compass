"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
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
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    assigned_to: String(formData.get("assigned_to") ?? "") || undefined,
    assignment_note: String(formData.get("assignment_note") ?? "") || undefined,
    priority: (String(formData.get("priority")) || "medium") as TaskPriority,
    start_date: String(formData.get("start_date") ?? "") || undefined,
    due_date: String(formData.get("due_date") ?? "") || undefined,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
}

export async function updateTaskAction(taskId: string, initiativeId: string, formData: FormData) {
  await requireUser();
  await updateTask(taskId, {
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || undefined,
    priority: (String(formData.get("priority")) || undefined) as TaskPriority | undefined,
    start_date: String(formData.get("start_date") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function reassignTaskAction(taskId: string, initiativeId: string, formData: FormData) {
  await requireUser();
  await reassignTask(
    taskId,
    String(formData.get("assigned_to")),
    String(formData.get("assignment_note") ?? "") || undefined
  );
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
