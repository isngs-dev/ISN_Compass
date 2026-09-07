import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/types/database";

export interface DashboardSummary {
  totalInitiatives: number;
  activeInitiatives: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  awaitingConfirmation: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: initiatives }, { data: tasks }] = await Promise.all([
    supabase.from("initiatives").select("id, status").eq("is_archived", false),
    supabase.from("tasks").select("id, status, due_date"),
  ]);

  const inits = initiatives ?? [];
  const allTasks = tasks ?? [];

  return {
    totalInitiatives: inits.length,
    activeInitiatives: inits.filter((i) => i.status === "active").length,
    totalTasks: allTasks.length,
    pendingTasks: allTasks.filter((t) => t.status !== "completed").length,
    completedTasks: allTasks.filter((t) => t.status === "completed").length,
    overdueTasks: allTasks.filter((t) => t.due_date && t.due_date < today && t.status !== "completed").length,
    awaitingConfirmation: allTasks.filter((t) => t.status === "completion_confirmed").length,
  };
}

export interface DashboardFilters {
  period?: "day" | "week" | "month";
  department_id?: string;
  initiative_id?: string;
  assigned_to?: string;
  status?: TaskStatus;
  q?: string;
}

function periodRange(period: "day" | "week" | "month") {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (period === "week") {
    start.setDate(now.getDate() - now.getDay());
    end.setDate(start.getDate() + 6);
  } else if (period === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export async function listDashboardTasks(filters: DashboardFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(
      "*, assignee:team_members(id, name), initiative:initiatives!inner(id, name, department_id, department:departments(id, name))"
    );

  if (filters.department_id) query = query.eq("initiative.department_id", filters.department_id);
  if (filters.initiative_id) query = query.eq("initiative_id", filters.initiative_id);
  if (filters.assigned_to) query = query.eq("assigned_to", filters.assigned_to);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("name", `%${filters.q}%`);
  if (filters.period) {
    const { start, end } = periodRange(filters.period);
    query = query.gte("due_date", start).lte("due_date", end);
  }

  const { data, error } = await query.order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
