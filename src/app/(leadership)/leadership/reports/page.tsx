import { listInitiatives } from "@/server/services/initiatives";
import { ReportsCharts } from "@/components/leadership/reports-charts";
import type { HealthStatus, InitiativeStatus } from "@/types/domain";

const HEALTH_LABELS: Record<HealthStatus, string> = { green: "On Track", amber: "At Risk", red: "Critical", grey: "On Hold", blue: "Completed" };
const STATUS_LABELS: Record<InitiativeStatus, string> = { planning: "Planning", active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled" };

export default async function ReportsPage() {
  const initiatives = await listInitiatives();

  const healthData = (Object.keys(HEALTH_LABELS) as HealthStatus[])
    .map((key) => ({ key, name: HEALTH_LABELS[key], value: initiatives.filter((i) => i.health === key).length }))
    .filter((d) => d.value > 0);

  const statusData = (Object.keys(STATUS_LABELS) as InitiativeStatus[])
    .map((key) => ({ name: STATUS_LABELS[key], value: initiatives.filter((i) => i.status === key).length }))
    .filter((d) => d.value > 0);

  const byVertical = new Map<string, number[]>();
  for (const i of initiatives) {
    const name = (i.business_vertical as { name?: string } | null)?.name ?? "Unassigned";
    if (!byVertical.has(name)) byVertical.set(name, []);
    byVertical.get(name)!.push(Number(i.percentage_complete));
  }
  const verticalData = Array.from(byVertical.entries()).map(([name, values]) => ({
    name,
    progress: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">{initiatives.length} initiatives across the organization</p>
      </div>

      {initiatives.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No data yet — create initiatives to see reports.</p>
      ) : (
        <ReportsCharts healthData={healthData} statusData={statusData} verticalData={verticalData} />
      )}
    </div>
  );
}
