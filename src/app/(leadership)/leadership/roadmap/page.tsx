import Link from "next/link";
import { listInitiatives } from "@/server/services/initiatives";
import { Card, CardContent } from "@/components/ui/card";
import { HealthBadge, PriorityBadge } from "@/components/shared/badges";
import { Progress } from "@/components/ui/progress";

export default async function RoadmapPage() {
  const initiatives = await listInitiatives();
  const withDates = initiatives.filter((i) => i.target_completion_date);
  const withoutDates = initiatives.filter((i) => !i.target_completion_date);

  const groups = new Map<string, typeof initiatives>();
  for (const i of withDates) {
    const d = new Date(i.target_completion_date!);
    const key = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }
  const sortedKeys = Array.from(groups.keys()).sort(
    (a, b) => new Date(`1 ${a}`).getTime() - new Date(`1 ${b}`).getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
        <p className="text-sm text-muted-foreground">Initiatives grouped by target completion date</p>
      </div>

      {sortedKeys.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No initiatives with a target date yet.</p>}

      <div className="flex flex-col gap-6">
        {sortedKeys.map((key) => (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{key}</h2>
            <Card>
              <CardContent className="flex flex-col gap-1 p-2">
                {groups.get(key)!.map((i) => (
                  <Link key={i.id} href={`/leadership/initiatives/${i.id}`} className="flex items-center gap-4 rounded-md px-3 py-2.5 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{i.code} · Due {i.target_completion_date}</div>
                    </div>
                    <PriorityBadge priority={i.priority} className="hidden sm:inline-flex" />
                    <div className="hidden w-32 md:block"><Progress value={i.percentage_complete} className="h-2" /></div>
                    <HealthBadge health={i.health} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>

      {withoutDates.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">No Target Date</h2>
          <Card>
            <CardContent className="flex flex-col gap-1 p-2">
              {withoutDates.map((i) => (
                <Link key={i.id} href={`/leadership/initiatives/${i.id}`} className="flex items-center gap-4 rounded-md px-3 py-2.5 hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.code}</div>
                  </div>
                  <HealthBadge health={i.health} />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
