import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/server/services/activity";
import { sendEmail } from "@/lib/email/resend";
import { taskAssignedEmail, adminConfirmationNoticeEmail } from "@/lib/email/templates";
import type { Database, TaskPriority, TaskStatus } from "@/types/database";

const TASK_SELECT = "*, assignee:team_members(id, name, email), initiative:initiatives(id, name)";

type TaskWithRelations = Database["public"]["Tables"]["tasks"]["Row"] & {
  assignee: { id: string; name: string; email: string } | null;
  initiative: { id: string; name: string } | null;
};

export async function getTask(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select(TASK_SELECT).eq("id", id).single();
  if (error) throw error;
  return data as unknown as TaskWithRelations;
}

export interface TaskFilters {
  status?: TaskStatus;
  assignedTo?: string;
  initiativeId?: string;
  overdueOnly?: boolean;
  dueBefore?: string;
  dueAfter?: string;
}

export async function listTasks(filters: TaskFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("tasks").select(TASK_SELECT);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  if (filters.initiativeId) query = query.eq("initiative_id", filters.initiativeId);
  if (filters.dueBefore) query = query.lte("due_date", filters.dueBefore);
  if (filters.dueAfter) query = query.gte("due_date", filters.dueAfter);
  if (filters.overdueOnly) {
    query = query.lt("due_date", new Date().toISOString().slice(0, 10)).neq("status", "completed");
  }
  const { data, error } = await query.order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithRelations[];
}

async function notifyAssignment(supabase: SupabaseClient<Database>, task: TaskWithRelations) {
  if (!task.assignee) return;
  const email = taskAssignedEmail({
    taskName: task.name,
    taskDescription: task.description,
    initiativeName: task.initiative?.name ?? "—",
    dueDate: task.due_date,
    priority: task.priority,
    instructions: task.assignment_note,
    confirmationToken: task.confirmation_token,
  });
  // Best-effort: assigning the task (below, already committed by the caller) must not
  // be lost just because email isn't configured yet or Resend has a transient failure.
  try {
    await sendEmail({ to: task.assignee.email, subject: email.subject, html: email.html });
  } catch (err) {
    console.error("Failed to email assignee for task", task.id, err);
  }
  await logActivity(supabase, {
    entity_type: "task",
    entity_id: task.id,
    action: "task_assigned",
    description: `Assigned to ${task.assignee.name}`,
  });
}

export interface CreateTaskInput {
  initiative_id: string;
  name: string;
  description?: string;
  assigned_to?: string;
  assignment_note?: string;
  priority: TaskPriority;
  start_date?: string;
  due_date?: string;
}

export async function createTask(input: CreateTaskInput) {
  const supabase = await createClient();
  // Assigning a task is what puts it "in progress" — the assignee has no login to flip
  // it themselves; the only status transition they can trigger is the confirm-link.
  const status: TaskStatus = input.assigned_to ? "in_progress" : "not_started";
  const { data, error } = await supabase.from("tasks").insert({ ...input, status }).select(TASK_SELECT).single();
  if (error) throw error;
  const task = data as unknown as TaskWithRelations;

  await logActivity(supabase, {
    entity_type: "task",
    entity_id: task.id,
    action: "task_created",
    description: `Task "${task.name}" created`,
  });
  if (task.assigned_to) await notifyAssignment(supabase, task);
  return task;
}

export async function updateTask(
  id: string,
  input: {
    name?: string;
    description?: string;
    priority?: TaskPriority;
    start_date?: string | null;
    due_date?: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(input).eq("id", id);
  if (error) throw error;
}

/** Assign or reassign — regenerates the confirmation token so a stale email link can't confirm the new run. */
export async function reassignTask(id: string, assignedTo: string, note?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      assigned_to: assignedTo,
      assignment_note: note ?? null,
      confirmation_token: crypto.randomUUID(),
      confirmed_at: null,
      completed_at: null,
      status: "in_progress" satisfies TaskStatus,
    })
    .eq("id", id)
    .select(TASK_SELECT)
    .single();
  if (error) throw error;
  const task = data as unknown as TaskWithRelations;

  await logActivity(supabase, {
    entity_type: "task",
    entity_id: id,
    action: "task_reassigned",
    description: `Reassigned to ${task.assignee?.name ?? "team member"}`,
  });
  await notifyAssignment(supabase, task);
  return task;
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw error;
  await logActivity(supabase, {
    entity_type: "task",
    entity_id: id,
    action: "task_status_changed",
    description: `Status changed to "${status.replace(/_/g, " ")}"`,
  });
}

export async function markTaskCompleted(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed" satisfies TaskStatus, completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logActivity(supabase, {
    entity_type: "task",
    entity_id: id,
    action: "task_marked_completed",
    description: "Admin marked task completed",
  });
}

/** Admin rejects the confirmation, or reopens a completed task — either way, back to In Progress with a fresh link. */
export async function reopenTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "in_progress" satisfies TaskStatus,
      confirmed_at: null,
      completed_at: null,
      confirmation_token: crypto.randomUUID(),
    })
    .eq("id", id);
  if (error) throw error;
  await logActivity(supabase, {
    entity_type: "task",
    entity_id: id,
    action: "task_reopened",
    description: "Task reopened",
  });
}

/** Permanent. */
export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Unauthenticated flows (confirm-completion link, reminder cron) — callers
// pass the service-role client from src/lib/supabase/admin.ts.
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public confirm-link lookup — a malformed/garbage token is "not found," not a server error. */
export async function getTaskByConfirmationToken(supabase: SupabaseClient<Database>, token: string) {
  if (!UUID_RE.test(token)) return null;
  const { data, error } = await supabase.from("tasks").select(TASK_SELECT).eq("confirmation_token", token).maybeSingle();
  if (error) throw error;
  return data as unknown as TaskWithRelations | null;
}

export async function confirmTaskCompletion(supabase: SupabaseClient<Database>, task: TaskWithRelations) {
  // The employee's confirm-link click completes the task outright — the Admin can
  // still reopen it (below, reopenTask) if the confirmation turns out to be wrong,
  // which serves as the after-the-fact "reject" path instead of a pre-completion gate.
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed" satisfies TaskStatus, confirmed_at: now, completed_at: now })
    .eq("id", task.id);
  if (error) throw error;

  await logActivity(supabase, {
    entity_type: "task",
    entity_id: task.id,
    action: "completion_confirmation_received",
    description: `${task.assignee?.name ?? "Team member"} confirmed completion — task marked completed`,
    actor: task.assignee?.name ?? "Team member",
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && task.initiative) {
    const email = adminConfirmationNoticeEmail({
      taskName: task.name,
      initiativeName: task.initiative.name,
      confirmedBy: task.assignee?.name ?? "Team member",
      initiativeId: task.initiative.id,
      taskId: task.id,
    });
    // Best-effort: the confirmation itself (status + activity log, above) must not be
    // lost just because email isn't configured yet or Resend has a transient failure.
    try {
      await sendEmail({ to: adminEmail, subject: email.subject, html: email.html });
    } catch (err) {
      console.error("Failed to email admin about confirmed task", task.id, err);
    }
  }
}

/** Tasks due within `withinDays` (or already overdue) that haven't been reminded about yet today. */
export async function listTasksNeedingReminder(supabase: SupabaseClient<Database>, withinDays = 2) {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + withinDays * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .not("assigned_to", "is", null)
    .not("due_date", "is", null)
    .lte("due_date", horizon)
    .in("status", ["not_started", "in_progress"])
    .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${today}`);
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithRelations[];
}

export async function markReminderSent(supabase: SupabaseClient<Database>, taskId: string) {
  const { error } = await supabase.from("tasks").update({ reminder_sent_at: new Date().toISOString() }).eq("id", taskId);
  if (error) throw error;
}
