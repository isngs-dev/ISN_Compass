import { createClient } from "@/lib/supabase/server";

export interface CommandCenterKpis {
  activeInitiatives: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  onHold: number;
  completed: number;
  openStrategicTasks: number;
  overdueCommitments: number;
  blockedInitiatives: number;
  decisionsRequired: number;
  openEscalations: number;
  upcomingMilestones: number;
  staleInitiatives: number;
}

export async function getCommandCenterKpis(orgId: string, noUpdateThresholdDays = 7): Promise<CommandCenterKpis> {
  const supabase = await createClient();

  const [{ data: initiatives }, { data: tasks }, { data: decisions }, { data: escalations }, { data: milestones }] =
    await Promise.all([
      supabase.from("initiatives").select("id, status, health, last_update_at").is("deleted_at", null),
      supabase.from("tasks").select("id, status, due_date, initiative_id").is("deleted_at", null),
      supabase.from("decisions").select("id, status").eq("status", "proposed"),
      supabase.from("escalations").select("id, status").in("status", ["open", "acknowledged"]),
      supabase
        .from("milestones")
        .select("id, due_date, status")
        .is("deleted_at", null)
        .gte("due_date", new Date().toISOString().slice(0, 10))
        .lte("due_date", new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)),
    ]);

  const inits = initiatives ?? [];
  const active = inits.filter((i) => i.status === "active");
  const staleThreshold = Date.now() - noUpdateThresholdDays * 86400000;

  const blockedInitiativeIds = new Set(
    (tasks ?? []).filter((t) => t.status === "blocked").map((t) => t.initiative_id)
  );

  return {
    activeInitiatives: active.length,
    onTrack: active.filter((i) => i.health === "green").length,
    atRisk: active.filter((i) => i.health === "amber").length,
    critical: active.filter((i) => i.health === "red").length,
    onHold: inits.filter((i) => i.status === "on_hold").length,
    completed: inits.filter((i) => i.status === "completed").length,
    openStrategicTasks: (tasks ?? []).filter((t) => !["completed", "cancelled"].includes(t.status)).length,
    overdueCommitments: (tasks ?? []).filter(
      (t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && !["completed", "cancelled"].includes(t.status)
    ).length,
    blockedInitiatives: blockedInitiativeIds.size,
    decisionsRequired: decisions?.length ?? 0,
    openEscalations: escalations?.length ?? 0,
    upcomingMilestones: milestones?.length ?? 0,
    staleInitiatives: inits.filter((i) => !i.last_update_at || new Date(i.last_update_at).getTime() < staleThreshold).length,
  };
}

export async function getInitiativesNeedingAttention() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("initiatives")
    .select("id, code, name, health, status, percentage_complete, last_update_at, business_vertical:business_verticals(name)")
    .is("deleted_at", null)
    .in("status", ["active", "on_hold"])
    .in("health", ["red", "amber"])
    .order("health");
  if (error) throw error;
  return data ?? [];
}

/** Manager view: workload across the team (task count + overdue by user). */
export async function getTeamWorkload(managerId: string) {
  const supabase = await createClient();
  const { data: reports } = await supabase.from("profiles").select("id, full_name").eq("manager_id", managerId);
  const reportIds = (reports ?? []).map((r) => r.id);
  if (!reportIds.length) return [];

  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("user_id, task:tasks(id, status, due_date)")
    .in("user_id", reportIds)
    .eq("assignment_role", "responsible")
    .eq("is_active", true);

  const today = new Date().toISOString().slice(0, 10);
  const typedAssignments = (assignments ?? []) as unknown as {
    user_id: string;
    task: { id: string; status: string; due_date: string | null } | null;
  }[];
  return (reports ?? []).map((r) => {
    const userTasks = typedAssignments.filter((a) => a.user_id === r.id).map((a) => a.task).filter(Boolean) as {
      id: string;
      status: string;
      due_date: string | null;
    }[];
    return {
      user: r,
      total: userTasks.length,
      open: userTasks.filter((t) => !["completed", "cancelled"].includes(t.status)).length,
      overdue: userTasks.filter((t) => t.due_date && t.due_date < today && !["completed", "cancelled"].includes(t.status)).length,
      blocked: userTasks.filter((t) => t.status === "blocked").length,
    };
  });
}
