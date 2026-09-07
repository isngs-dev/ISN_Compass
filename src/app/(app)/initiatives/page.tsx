import Link from "next/link";
import { listInitiatives } from "@/server/services/initiatives";
import { listDepartments } from "@/server/services/departments";
import { createInitiativeAction } from "@/server/actions/initiatives";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { InitiativeStatusBadge } from "@/components/shared/badges";
import type { InitiativeStatus } from "@/types/database";

const STATUSES: InitiativeStatus[] = ["not_started", "active", "on_hold", "completed"];

export default async function InitiativesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const [initiatives, departments] = await Promise.all([
    listInitiatives({
      department_id: sp.department || undefined,
      status: (sp.status as InitiativeStatus) || undefined,
    }),
    listDepartments(),
  ]);

  function buildHref(next: Record<string, string | undefined>) {
    const params = new URLSearchParams({ ...sp, ...next } as Record<string, string>);
    for (const [k, v] of Array.from(params.entries())) if (!v) params.delete(k);
    return `/initiatives${params.toString() ? `?${params}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Initiatives</h1>
          <p className="text-sm text-muted-foreground">{initiatives.length} initiative{initiatives.length === 1 ? "" : "s"}</p>
        </div>
        <FormDialog triggerLabel="New Initiative" title="Create Initiative" action={createInitiativeAction}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="name">Initiative Name</Label><Input id="name" name="name" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={3} /></div>
          <div className="flex flex-col gap-1.5">
            <Label>Department</Label>
            <Select name="department_id" items={departments.map((d) => ({ value: d.id, label: d.name }))} required>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="start_date">Start Date</Label><Input id="start_date" name="start_date" type="date" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="target_date">Target Date</Label><Input id="target_date" name="target_date" type="date" /></div>
          </div>
        </FormDialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={buildHref({ department: undefined })}><FilterChip active={!sp.department} label="All Departments" /></Link>
        {departments.map((d) => (
          <Link key={d.id} href={buildHref({ department: d.id })}><FilterChip active={sp.department === d.id} label={d.name} /></Link>
        ))}
        <span className="mx-1 w-px bg-border" />
        {STATUSES.map((s) => (
          <Link key={s} href={buildHref({ status: sp.status === s ? undefined : s })}><FilterChip active={sp.status === s} label={s.replace(/_/g, " ")} /></Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {initiatives.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No initiatives match these filters.</p>}
          {initiatives.map((i) => (
            <Link key={i.id} href={`/initiatives/${i.id}`} className="flex items-center gap-4 rounded-md px-3 py-3 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{i.name}</div>
                <div className="text-xs text-muted-foreground">{(i.department as { name?: string } | null)?.name}</div>
              </div>
              {i.target_date && <div className="hidden text-xs text-muted-foreground sm:block">Target {i.target_date}</div>}
              <InitiativeStatusBadge status={i.status} />
            </Link>
          ))}
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
