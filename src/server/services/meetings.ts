import { createClient } from "@/lib/supabase/server";

/**
 * "Since Last Meeting" engine (spec §30): diffs current DB state against the
 * previous meeting's timestamp to build the weekly strategy review agenda.
 */
export async function buildSinceLastMeetingReport(orgId: string, sinceIso: string | null) {
  const supabase = await createClient();
  const since = sinceIso ?? new Date(0).toISOString();

  const [
    { data: completedTasks },
    { data: overdueTasks },
    { data: newBlockers },
    { data: newRisks },
    { data: newDecisions },
    { data: newInitiatives },
    { data: completedMilestones },
  ] = await Promise.all([
    supabase.from("tasks").select("id, title, completion_date, initiative:initiatives(name)").eq("status", "completed").gte("completion_date", since.slice(0, 10)),
    supabase.from("tasks").select("id, title, due_date, initiative:initiatives(name)").lt("due_date", new Date().toISOString().slice(0, 10)).not("status", "in", "(completed,cancelled)"),
    supabase.from("tasks").select("id, title, initiative:initiatives(name)").eq("status", "blocked").gte("updated_at", since),
    supabase.from("risks").select("id, description, status").gte("created_at", since),
    supabase.from("decisions").select("id, title, status").gte("created_at", since),
    supabase.from("initiatives").select("id, name, code").gte("created_at", since).is("deleted_at", null),
    supabase.from("milestones").select("id, name, initiative:initiatives(name)").eq("status", "completed").gte("updated_at", since),
  ]);

  return {
    completedTasks: completedTasks ?? [],
    overdueTasks: overdueTasks ?? [],
    newBlockers: newBlockers ?? [],
    newRisks: newRisks ?? [],
    newDecisions: newDecisions ?? [],
    newInitiatives: newInitiatives ?? [],
    completedMilestones: completedMilestones ?? [],
  };
}

export async function listMeetings(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, created_by_profile:profiles!meetings_created_by_fkey(id, full_name)")
    .order("meeting_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getLastCompletedMeeting(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select("*")
    .eq("status", "completed")
    .order("meeting_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function createMeeting(input: { organization_id: string; title: string; meeting_date: string; created_by: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("meetings").insert({ ...input, status: "in_progress" }).select().single();
  if (error) throw error;
  return data;
}

export async function completeMeeting(id: string, notes: string, summary: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ status: "completed", notes, summary, end_time: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getMeeting(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, attendees:meeting_attendees(id, user:profiles(id, full_name)), items:meeting_items(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
