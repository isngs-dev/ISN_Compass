import { createClient } from "@/lib/supabase/server";
import type { PriorityLevel } from "@/types/domain";

export async function createMilestone(input: {
  initiative_id: string;
  name: string;
  description?: string;
  owner_id?: string;
  due_date?: string;
  weight: number;
  priority: PriorityLevel;
  approval_required?: boolean;
  created_by: string;
  organization_id: string;
}) {
  const supabase = await createClient();
  const { organization_id, ...fields } = input;
  const { data, error } = await supabase.from("milestones").insert(fields).select().single();
  if (error) throw error;

  await supabase.from("audit_logs").insert({
    organization_id,
    entity_type: "milestone",
    entity_id: data.id,
    action: "created",
    actor_id: input.created_by,
    new_value: { name: input.name, weight: input.weight },
  });

  return data;
}

export async function updateMilestoneStatus(
  milestoneId: string,
  status: string,
  actorId: string,
  organizationId: string
) {
  const supabase = await createClient();
  const { data: prev } = await supabase.from("milestones").select("status").eq("id", milestoneId).single();
  const { error } = await supabase.from("milestones").update({ status }).eq("id", milestoneId);
  if (error) throw error;

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    entity_type: "milestone",
    entity_id: milestoneId,
    action: "status_changed",
    actor_id: actorId,
    previous_value: { status: prev?.status },
    new_value: { status },
  });
}
