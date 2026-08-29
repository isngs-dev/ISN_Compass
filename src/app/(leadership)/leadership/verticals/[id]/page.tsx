import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getVertical } from "@/server/services/verticals";
import { listInitiatives } from "@/server/services/initiatives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthBadge, InitiativeStatusBadge } from "@/components/shared/badges";
import { Progress } from "@/components/ui/progress";

export default async function VerticalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const vertical = await getVertical(id).catch(() => null);
  if (!vertical) notFound();

  const initiatives = await listInitiatives({ vertical_id: id });
  const active = initiatives.filter((i) => i.status === "active");
  const avgProgress = active.length ? Math.round(active.reduce((s, i) => s + Number(i.percentage_complete), 0) / active.length) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{vertical.name}</h1>
        <p className="text-sm text-muted-foreground">{vertical.description ?? "No description provided."}</p>
        <p className="mt-1 text-sm">
          Vertical Head: <span className="font-medium">{(vertical.vertical_head as { full_name?: string } | null)?.full_name ?? "Unassigned"}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="py-4"><div className="text-xs text-muted-foreground">Active Initiatives</div><div className="text-2xl font-semibold">{active.length}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-muted-foreground">Avg. Progress</div><div className="text-2xl font-semibold">{avgProgress}%</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-muted-foreground">At Risk / Critical</div><div className="text-2xl font-semibold">{active.filter((i) => i.health === "amber" || i.health === "red").length}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-muted-foreground">Total Initiatives</div><div className="text-2xl font-semibold">{initiatives.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Initiatives</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1">
          {initiatives.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No initiatives in this vertical yet.</p>}
          {initiatives.map((i) => (
            <Link key={i.id} href={`/leadership/initiatives/${i.id}`} className="flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.code}</div>
              </div>
              <div className="hidden w-40 sm:block"><Progress value={i.percentage_complete} className="h-2" /></div>
              <InitiativeStatusBadge status={i.status} />
              <HealthBadge health={i.health} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
