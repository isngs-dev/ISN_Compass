import { requireUser } from "@/server/auth/session";
import { listGoals } from "@/server/services/goals";
import { listVerticals } from "@/server/services/verticals";
import { listOrgMembers } from "@/server/services/org";
import { createGoalAction } from "@/server/actions/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default async function GoalsPage() {
  await requireUser();
  const [goals, verticals, members] = await Promise.all([listGoals(), listVerticals(), listOrgMembers()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Strategic Goals</h1>
          <p className="text-sm text-muted-foreground">Annual and quarterly company goals initiatives contribute toward.</p>
        </div>
        <FormDialog triggerLabel="New Goal" title="Create Strategic Goal" action={createGoalAction}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="period">Period</Label><Input id="period" name="period" placeholder="FY2026 / Q3-2026" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="target">Target</Label><Input id="target" name="target" placeholder="e.g. 20% revenue growth" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={3} /></div>
          <div className="flex flex-col gap-1.5">
            <Label>Owner</Label>
            <Select name="owner_id">
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Business Vertical</Label>
            <Select name="business_vertical_id">
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{verticals.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </FormDialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {goals.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No strategic goals yet.</p>}
        {goals.map((g) => (
          <Card key={g.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{g.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{g.period}</p>
              </div>
              <Badge variant="secondary">{g.status.replace("_", " ")}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{g.description}</p>
              {g.target && <p className="text-sm">Target: <span className="font-medium">{g.target}</span></p>}
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{g.progress}%</span></div>
                <Progress value={g.progress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">
                Owner: {(g.owner as { full_name?: string } | null)?.full_name ?? "Unassigned"}
                {g.business_vertical ? ` · ${(g.business_vertical as { name?: string }).name}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
