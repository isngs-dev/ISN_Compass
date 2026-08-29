import { createClient } from "@/lib/supabase/server";

export async function listVerticals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_verticals")
    .select("*, vertical_head:profiles!business_verticals_vertical_head_id_fkey(id, full_name)")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getVertical(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_verticals")
    .select("*, vertical_head:profiles!business_verticals_vertical_head_id_fkey(id, full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createVertical(input: {
  organization_id: string;
  name: string;
  description?: string;
  vertical_head_id?: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("business_verticals").insert(input).select().single();
  if (error) throw error;
  return data;
}
