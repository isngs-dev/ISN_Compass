import { Fragment } from "react";
import { listIssues, listRisks } from "@/server/services/governance";
import { listInitiatives } from "@/server/services/initiatives";
import { listOrgMembers } from "@/server/services/org";
import { createIssueAction, createRiskAction } from "@/server/actions/governance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/shared/form-dialog";
import { cn } from "@/lib/utils";
import type { RiskProbability, RiskImpact } from "@/types/domain";

const LEVELS: RiskProbability[] = ["high", "medium", "low"];
const IMPACTS: RiskImpact[] = ["low", "medium", "high"];

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default async function IssuesRisksPage() {
  const [issues, risks, initiatives, members] = await Promise.all([
    listIssues(), listRisks(), listInitiatives(), listOrgMembers(),
  ]);

  const matrix = LEVELS.map((p) => IMPACTS.map((i) => risks.filter((r) => r.probability === p && r.impact === i).length));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Issues & Risks</h1>
        <p className="text-sm text-muted-foreground">Track blockers and forward-looking risks across initiatives</p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Risk Matrix</h2>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-4">
            <div className="grid grid-cols-4 gap-1 text-xs">
              <div />
              {IMPACTS.map((i) => <div key={i} className="text-center font-medium capitalize text-muted-foreground">{i} impact</div>)}
              {LEVELS.map((p, r) => (
                <Fragment key={p}>
                  <div className="flex items-center justify-end pr-2 font-medium capitalize text-muted-foreground">{p}</div>
                  {matrix[r].map((count, c) => (
                    <div
                      key={`${p}-${c}`}
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-md text-lg font-semibold",
                        r + c >= 3 ? "bg-red-100 text-red-800" : r + c === 2 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {count}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Risks ({risks.length})</h2>
          <FormDialog triggerLabel="Add Risk" title="Log a Risk" submitLabel="Add" action={createRiskAction}>
            <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" required rows={2} /></div>
            <div className="flex flex-col gap-1.5">
              <Label>Related Initiative</Label>
              <Select name="initiative_id"><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{initiatives.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Probability</Label>
                <Select name="probability" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Impact</Label>
                <Select name="impact" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Owner</Label>
              <Select name="owner_id"><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="mitigation">Mitigation</Label><Textarea id="mitigation" name="mitigation" rows={2} /></div>
          </FormDialog>
        </div>
        {risks.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No risks logged.</p>}
        <div className="flex flex-col gap-2">
          {risks.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {(r.initiative as { name?: string } | null)?.name ?? "—"} · Owner: {r.owner?.full_name ?? "Unassigned"}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{r.probability} / {r.impact}</Badge>
                <span className="text-sm font-semibold">{r.risk_score}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Issues ({issues.length})</h2>
          <FormDialog triggerLabel="Log Issue" title="Log an Issue" submitLabel="Add" action={createIssueAction}>
            <div className="flex flex-col gap-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
            <div className="flex flex-col gap-1.5">
              <Label>Related Initiative</Label>
              <Select name="initiative_id"><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{initiatives.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Severity</Label>
              <Select name="severity" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Owner</Label>
              <Select name="owner_id"><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent></Select>
            </div>
          </FormDialog>
        </div>
        {issues.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No issues logged.</p>}
        <div className="flex flex-col gap-2">
          {issues.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{i.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {(i.initiative as { name?: string } | null)?.name ?? "—"} · Owner: {i.owner?.full_name ?? "Unassigned"}
                  </div>
                </div>
                <Badge className={cn("capitalize", SEVERITY_STYLES[i.severity])} variant="outline">{i.severity}</Badge>
                <Badge variant="secondary" className="capitalize">{i.status.replace("_", " ")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
