import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/utils/codes";
import type { PriorityLevel, TaskStatus } from "@/types/domain";

const TASK_SELECT = `
  *,
  initiative:initiatives(id, name, code),
  milestone:milestones(id, name),
  assignments:task_assignments(id, assignment_role, is_active, user:profiles!task_assignments_user_id_fkey(id, full_name, avatar_url)),
  subtasks:tasks!parent_task_id(id, title, status, percentage_complete),
  updates:task_updates(id, note, percentage_complete, status_at_update, created_at, author:profiles(id, full_name))
`;

export async function getTask(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .order("created_at", { referencedTable: "task_updates", ascending: false })
    .single();
  if (error) throw error;
  return data;
}

export async function listTasksForInitiative(initiativeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("initiative_id", initiativeId)
    .is("deleted_at", null);
  if (error) throw error;
  return data ?? [];
}

interface TaskWithInitiative {
  id: string;
  title: string;
  status: TaskStatus;
  priority: PriorityLevel;
  due_date: string | null;
  percentage_complete: number;
  deleted_at: string | null;
  initiative: { id: string; name: string; code: string } | null;
  [key: string]: unknown;
}

/** "My Work": tasks where I am the responsible person. */
export async function listMyTasks(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_assignments")
    .select("task:tasks(*, initiative:initiatives(id, name, code))")
    .eq("user_id", userId)
    .eq("assignment_role", "responsible")
    .eq("is_active", true);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { task: TaskWithInitiative | null }[];
  return rows.map((r) => r.task).filter((t): t is TaskWithInitiative => !!t && !t.deleted_at);
}

/** All active tasks I'm assigned to, any role (responsible or contributor). */
export async function listTasksForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_assignments")
    .select("assignment_role, task:tasks(*, initiative:initiatives(id, name, code))")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { assignment_role: string; task: TaskWithInitiative | null }[];

  const byTaskId = new Map<string, TaskWithInitiative & { my_role: string }>();
  for (const row of rows) {
    if (!row.task || row.task.deleted_at) continue;
    if (!byTaskId.has(row.task.id)) byTaskId.set(row.task.id, { ...row.task, my_role: row.assignment_role });
  }
  return Array.from(byTaskId.values());
}

/** Tasks delegated by me (still active). */
export async function listDelegatedByMe(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_delegations")
    .select("*, task:tasks(id, title, status, due_date, code), delegated_to_profile:profiles!task_delegations_delegated_to_fkey(id, full_name)")
    .eq("delegated_by", userId)
    .eq("is_active", true)
    .order("delegated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDelegationTree(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_delegations")
    .select(
      "*, delegated_by_profile:profiles!task_delegations_delegated_by_fkey(id, full_name), delegated_to_profile:profiles!task_delegations_delegated_to_fkey(id, full_name)"
    )
    .eq("task_id", taskId)
    .order("delegated_at");
  if (error) throw error;
  return data ?? [];
}

export interface CreateTaskInput {
  organization_id: string;
  title: string;
  description?: string;
  initiative_id: string;
  milestone_id?: string;
  parent_task_id?: string;
  weight?: number;
  due_date?: string;
  priority: PriorityLevel;
  visibility?: string;
  approval_required?: boolean;
  created_by: string;
  responsible_id?: string;
  contributor_ids?: string[];
}

export async function createTask(input: CreateTaskInput) {
  const supabase = await createClient();
  const { responsible_id, contributor_ids, ...fields } = input;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      ...fields,
      code: generateCode("TASK"),
      status: "not_started",
      assignment_date: responsible_id ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;

  const assignments: { task_id: string; user_id: string; assignment_role: string; assigned_by: string }[] = [];
  if (responsible_id) {
    assignments.push({
      task_id: task.id,
      user_id: responsible_id,
      assignment_role: "responsible",
      assigned_by: input.created_by,
    });
  }
  for (const uid of contributor_ids ?? []) {
    assignments.push({ task_id: task.id, user_id: uid, assignment_role: "contributor", assigned_by: input.created_by });
  }
  if (assignments.length) {
    const { error: assignError } = await supabase.from("task_assignments").insert(assignments);
    if (assignError) throw assignError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: input.organization_id,
    entity_type: "task",
    entity_id: task.id,
    action: "created",
    actor_id: input.created_by,
    new_value: { title: input.title, responsible_id },
  });

  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, percentageComplete?: number) {
  const supabase = await createClient();
  const update: { status: TaskStatus; percentage_complete?: number; completion_date?: string | null } = { status };
  if (percentageComplete !== undefined) update.percentage_complete = percentageComplete;
  if (status === "completed") {
    update.completion_date = new Date().toISOString().slice(0, 10);
    if (update.percentage_complete === undefined) update.percentage_complete = 100;
  }
  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) throw error;
}

export async function addTaskUpdate(input: {
  task_id: string;
  author_id: string;
  note: string;
  percentage_complete?: number;
  status_at_update?: TaskStatus;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("task_updates").insert(input);
  if (error) throw error;
}

export async function delegateTask(input: {
  task_id: string;
  delegated_by: string;
  delegated_to: string;
  delegated_due_date?: string;
  instructions?: string;
  parent_delegation_id?: string;
}) {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("due_date").eq("id", input.task_id).single();

  const { error: delegationError } = await supabase.from("task_delegations").insert({
    ...input,
    original_due_date: task?.due_date ?? null,
  });
  if (delegationError) throw delegationError;

  // Execution moves to the delegate as "responsible"; accountability chain is preserved
  // via task_delegations history (delegated_by is never overwritten).
  await supabase
    .from("task_assignments")
    .update({ is_active: false })
    .eq("task_id", input.task_id)
    .eq("assignment_role", "responsible");

  const { error: assignError } = await supabase.from("task_assignments").upsert(
    {
      task_id: input.task_id,
      user_id: input.delegated_to,
      assignment_role: "responsible",
      assigned_by: input.delegated_by,
      is_active: true,
    },
    { onConflict: "task_id,user_id,assignment_role" }
  );
  if (assignError) throw assignError;
}

export async function setTaskDueDate(taskId: string, newDueDate: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_task_due_date", {
    p_task_id: taskId,
    p_new_due_date: newDueDate,
    p_reason: reason,
  });
  if (error) throw error;
}
