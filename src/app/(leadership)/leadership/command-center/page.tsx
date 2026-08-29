import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getCommandCenterKpis, getInitiativesNeedingAttention } from "@/server/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthBadge } from "@/components/shared/badges";
import { Progress } from "@/components/ui/progress";

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "amber" | "red" | "default" }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div
          className={
            "mt-1 text-2xl font-semibold " +
            (tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "")
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function CommandCenterPage() {
  const user = await requireUser();
  const [kpis, attention] = await Promise.all([
    getCommandCenterKpis(user.profile.organization_id),
    getInitiativesNeedingAttention(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground">What is happening, what is delayed, and what needs your attention.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Active Initiatives" value={kpis.activeInitiatives} />
        <Kpi label="On Track" value={kpis.onTrack} />
        <Kpi label="At Risk" value={kpis.atRisk} tone="amber" />
        <Kpi label="Critical / Delayed" value={kpis.critical} tone="red" />
        <Kpi label="On Hold" value={kpis.onHold} />
        <Kpi label="Completed" value={kpis.completed} />
        <Kpi label="Open Strategic Tasks" value={kpis.openStrategicTasks} />
        <Kpi label="Overdue Commitments" value={kpis.overdueCommitments} tone={kpis.overdueCommitments > 0 ? "red" : "default"} />
        <Kpi label="Blocked Initiatives" value={kpis.blockedInitiatives} tone={kpis.blockedInitiatives > 0 ? "amber" : "default"} />
        <Kpi label="Decisions Required" value={kpis.decisionsRequired} tone={kpis.decisionsRequired > 0 ? "amber" : "default"} />
        <Kpi label="Open Escalations" value={kpis.openEscalations} tone={kpis.openEscalations > 0 ? "red" : "default"} />
        <Kpi label="Upcoming Milestones (14d)" value={kpis.upcomingMilestones} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requires Management Attention</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {attention.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing needs attention right now — all active initiatives are green.
            </p>
          )}
          {attention.map((i) => (
            <Link
              key={i.id}
              href={`/leadership/initiatives/${i.id}`}
              className="flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{i.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(i.business_vertical as { name?: string } | null)?.name ?? "—"} · {i.code}
                </div>
              </div>
              <div className="hidden w-40 sm:block">
                <Progress value={i.percentage_complete} className="h-2" />
              </div>
              <HealthBadge health={i.health} />
            </Link>
          ))}
        </CardContent>
      </Card>

      {kpis.staleInitiatives > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-800">
            {kpis.staleInitiatives} initiative{kpis.staleInitiatives > 1 ? "s haven't" : " hasn't"} been updated recently and may need a check-in.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
