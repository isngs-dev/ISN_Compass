import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listInitiatives } from "@/server/services/initiatives";
import { listVerticals } from "@/server/services/verticals";
import { listGoals } from "@/server/services/goals";
import { listOrgMembers } from "@/server/services/org";
import { createInitiativeAction } from "@/server/actions/initiatives";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { HealthBadge, InitiativeStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { Progress } from "@/components/ui/progress";
import type { InitiativeCategory, InitiativeStatus, HealthStatus } from "@/types/domain";

const CATEGORIES: InitiativeCategory[] = [
  "revenue_growth","new_product","business_development","client_delivery","technology",
  "automation","cost_reduction","operational_improvement","compliance","hr","strategic_partnership",
];
const STATUSES: InitiativeStatus[] = ["planning","active","on_hold","completed","cancelled"];
const HEALTHS: HealthStatus[] = ["green","amber","red","grey","blue"];

export default async function InitiativesPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string; status?: string; health?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const [initiatives, verticals, goals, members] = await Promise.all([
    listInitiatives({
      vertical_id: sp.vertical || undefined,
      status: (sp.status as InitiativeStatus) || undefined,
      health: (sp.health as HealthStatus) || undefined,
    }),
    listVerticals(),
    listGoals(),
    listOrgMembers(),
  ]);

  function buildHref(next: Record<string, string | undefined>) {
    const params = new URLSearchParams({ ...sp, ...next } as Record<string, string>);
    for (const [k, v] of Array.from(params.entries())) if (!v) params.delete(k);
    return `/leadership/initiatives${params.toString() ? `?${params}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Initiatives</h1>
          <p className="text-sm text-muted-foreground">{initiatives.length} initiative{initiatives.length === 1 ? "" : "s"}</p>
        </div>
        <FormDialog triggerLabel="New Initiative" title="Create Initiative" description="Strategy starts here — every initiative must have an accountable owner." action={createInitiativeAction}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="name">Initiative Name</Label><Input id="name" name="name" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="strategic_objective">Strategic Objective</Label><Input id="strategic_objective" name="strategic_objective" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Business Vertical</Label>
              <Select name="business_vertical_id" required>
                <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
                <SelectContent>{verticals.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Strategic Goal</Label>
              <Select name="strategic_goal_id">
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select name="category" required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select name="priority" defaultValue="p3_normal" required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="p1_critical">P1 Critical</SelectItem>
                  <SelectItem value="p2_high">P2 High</SelectItem>
                  <SelectItem value="p3_normal">P3 Normal</SelectItem>
                  <SelectItem value="p4_low">P4 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="start_date">Start Date</Label><Input id="start_date" name="start_date" type="date" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="target_completion_date">Target Completion</Label><Input id="target_completion_date" name="target_completion_date" type="date" /></div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Accountable Owner *</Label>
            <Select name="accountable_owner_id" required>
              <SelectTrigger><SelectValue placeholder="Ultimately responsible for delivery" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Executive Sponsor</Label>
              <Select name="executive_sponsor_id">
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Responsible Manager</Label>
              <Select name="responsible_manager_id">
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </FormDialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={buildHref({ vertical: undefined })}><FilterChip active={!sp.vertical} label="All Verticals" /></Link>
        {verticals.map((v) => (
          <Link key={v.id} href={buildHref({ vertical: v.id })}><FilterChip active={sp.vertical === v.id} label={v.name} /></Link>
        ))}
        <span className="mx-1 w-px bg-border" />
        {STATUSES.map((s) => (
          <Link key={s} href={buildHref({ status: sp.status === s ? undefined : s })}><FilterChip active={sp.status === s} label={s.replace("_", " ")} /></Link>
        ))}
        <span className="mx-1 w-px bg-border" />
        {HEALTHS.map((h) => (
          <Link key={h} href={buildHref({ health: sp.health === h ? undefined : h })}><FilterChip active={sp.health === h} label={h} /></Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {initiatives.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No initiatives match these filters.</p>}
          {initiatives.map((i) => {
            const owner = (i.members ?? []).find((m: { member_role: string }) => m.member_role === "accountable_owner");
            return (
              <Link key={i.id} href={`/leadership/initiatives/${i.id}`} className="flex items-center gap-4 rounded-md px-3 py-3 hover:bg-muted">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.code} · {(i.business_vertical as { name?: string } | null)?.name} · Owner: {owner?.user?.full_name ?? "Unassigned"}
                  </div>
                </div>
                <PriorityBadge priority={i.priority} className="hidden sm:inline-flex" />
                <div className="hidden w-32 md:block"><Progress value={i.percentage_complete} className="h-2" /></div>
                <InitiativeStatusBadge status={i.status} />
                <HealthBadge health={i.health} />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </span>
  );
}
