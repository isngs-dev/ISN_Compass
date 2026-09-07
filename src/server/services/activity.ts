import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function logActivity(
  supabase: SupabaseClient<Database>,
  entry: {
    entity_type: "initiative" | "task";
    entity_id: string;
    action: string;
    description: string;
    actor?: string;
  }
) {
  const { error } = await supabase.from("activity_log").insert(entry);
  if (error) throw error;
}

export async function listActivity(limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listActivityForEntity(entityType: "initiative" | "task", entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
