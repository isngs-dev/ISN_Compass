import { createClient } from "@/lib/supabase/server";

export async function listGoals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategic_goals")
    .select("*, owner:profiles!strategic_goals_owner_id_fkey(id, full_name), business_vertical:business_verticals(id, name)")
    .order("period", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGoal(input: {
  organization_id: string;
  name: string;
  description?: string;
  period: string;
  owner_id?: string;
  target?: string;
  business_vertical_id?: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("strategic_goals").insert(input).select().single();
  if (error) throw error;
  return data;
}
