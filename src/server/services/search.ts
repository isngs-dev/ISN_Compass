import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  type: "initiative" | "task";
  title: string;
  subtitle: string;
  href: string;
}

/** Simple cross-entity search by name/title/code, scoped by RLS to what the caller can see. */
export async function globalSearch(query: string, includeInitiatives: boolean): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();

  const [{ data: tasks }, { data: initiatives }] = await Promise.all([
    supabase.from("tasks").select("id, title, code, status").is("deleted_at", null).or(`title.ilike.%${q}%,code.ilike.%${q}%`).limit(15),
    includeInitiatives
      ? supabase.from("initiatives").select("id, name, code, status").is("deleted_at", null).or(`name.ilike.%${q}%,code.ilike.%${q}%`).limit(15)
      : Promise.resolve({ data: [] as { id: string; name: string; code: string; status: string }[] }),
  ]);

  const results: SearchResult[] = [];
  for (const i of initiatives ?? []) {
    results.push({ id: i.id, type: "initiative", title: i.name, subtitle: `${i.code} · ${i.status}`, href: `/leadership/initiatives/${i.id}` });
  }
  for (const t of tasks ?? []) {
    results.push({ id: t.id, type: "task", title: t.title, subtitle: `${t.code} · ${t.status}`, href: `/team/tasks/${t.id}` });
  }
  return results;
}
