import Link from "next/link";
import { getDashboardSummary, listDashboardTasks } from "@/server/services/dashboard";
import { listDepartments } from "@/server/services/departments";
import { listInitiatives } from "@/server/services/initiatives";
import { listTeamMembers } from "@/server/services/team-members";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { isTaskOverdue } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";

const STATUSES: TaskStatus[] = ["not_started", "in_progress", "completion_confirmed", "completed"];

// Base UI's <Select.Value> renders the raw value unless the Select is given `items` to
// resolve a label from — without it, a pre-selected value (from the URL, on page load)
// shows as "any" / a raw id instead of its label until the dropdown is opened once.
const PERIOD_ITEMS = [
  { value: "any", label: "Any time" },
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];
const STATUS_ITEMS = [{ value: "any", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))];

interface DashboardSearchParams {
  period?: "day" | "week" | "month";
  department?: string;
  initiative?: string;
  member?: string;
  status?: string;
  q?: string;
}

/** The filter <Select>s use "any" as their "no filter" option's value (a real <select>
 * can't submit an empty string as a distinct choice from "unset"), so it has to be
 * translated back to undefined before it reaches a query — otherwise `.eq("...", "any")`
 * hits Postgres with "any" where a uuid/enum is expected. */
function normalize<T extends string>(value: string | undefined): T | undefined {
  return !value || value === "any" ? undefined : (value as T);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const sp = await searchParams;

  const [summary, tasks, departments, initiatives, members] = await Promise.all([
    getDashboardSummary(),
    listDashboardTasks({
      period: normalize<"day" | "week" | "month">(sp.period),
      department_id: normalize(sp.department),
      initiative_id: normalize(sp.initiative),
      assigned_to: normalize(sp.member),
      status: normalize<TaskStatus>(sp.status),
      q: sp.q || undefined,
    }),
    listDepartments(),
    listInitiatives(),
    listTeamMembers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Everything tracked in one place.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <SummaryCard label="Total Initiatives" value={summary.totalInitiatives} />
        <SummaryCard label="Active Initiatives" value={summary.activeInitiatives} />
        <SummaryCard label="Total Tasks" value={summary.totalTasks} />
        <SummaryCard label="Pending Tasks" value={summary.pendingTasks} />
        <SummaryCard label="Completed Tasks" value={summary.completedTasks} />
        <SummaryCard label="Overdue Tasks" value={summary.overdueTasks} highlight={summary.overdueTasks > 0} />
        <SummaryCard label="Awaiting Confirmation" value={summary.awaitingConfirmation} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <form className="flex flex-wrap items-end gap-3" action="/dashboard">
            <Field label="Search Task">
              <Input name="q" defaultValue={sp.q} placeholder="Task name…" className="h-9 w-40" />
            </Field>
            <Field label="Period">
              <Select name="period" defaultValue={sp.period ?? "any"} items={PERIOD_ITEMS}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any time</SelectItem>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department">
              <Select
                name="department"
                defaultValue={sp.department ?? "any"}
                items={[{ value: "any", label: "All departments" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
              >
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Initiative">
              <Select
                name="initiative"
                defaultValue={sp.initiative ?? "any"}
                items={[{ value: "any", label: "All initiatives" }, ...initiatives.map((i) => ({ value: i.id, label: i.name }))]}
              >
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All initiatives</SelectItem>
                  {initiatives.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Team Member">
              <Select
                name="member"
                defaultValue={sp.member ?? "any"}
                items={[{ value: "any", label: "All members" }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
              >
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All members</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={sp.status ?? "any"} items={STATUS_ITEMS}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any status</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <button type="submit" className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-muted">Apply</button>
            <Link href="/dashboard" className="h-9 rounded-md px-3 text-sm text-muted-foreground underline-offset-4 hover:underline">Clear</Link>
          </form>

          <div className="flex flex-col gap-1">
            {tasks.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No tasks match these filters.</p>}
            {tasks.map((t) => {
              const overdue = isTaskOverdue(t.due_date, t.status);
              const initiative = t.initiative as { id: string; name: string; department: { name: string } | null } | null;
              return (
                <Link key={t.id} href={`/initiatives/${initiative?.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {initiative?.name} · {(t.assignee as { name?: string } | null)?.name ?? "Unassigned"}
                      {t.due_date ? ` · Due ${t.due_date}` : ""}
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} className="hidden sm:inline-flex" />
                  <TaskStatusBadge status={t.status} overdue={overdue} />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${highlight ? "text-red-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
