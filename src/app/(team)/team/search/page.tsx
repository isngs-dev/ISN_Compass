import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { globalSearch } from "@/server/services/search";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function TeamSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q } = await searchParams;
  const results = q ? await globalSearch(q, false) : [];

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">Search tasks by title or code</p>
      </div>

      <form action="/team/search" className="max-w-lg">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by title or code…" autoFocus />
      </form>

      {q && results.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No results for &quot;{q}&quot;.</p>}

      {results.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-1 p-2">
            {results.map((r) => (
              <Link key={`${r.type}-${r.id}`} href={r.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
                <Badge variant="secondary" className="capitalize">{r.type}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
