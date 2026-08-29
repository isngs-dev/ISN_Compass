import { listDecisions } from "@/server/services/governance";
import { listInitiatives } from "@/server/services/initiatives";
import { listOrgMembers } from "@/server/services/org";
import { createDecisionAction } from "@/server/actions/governance";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/shared/form-dialog";

export default async function DecisionsPage() {
  const [decisions, initiatives, members] = await Promise.all([listDecisions(), listInitiatives(), listOrgMembers()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Decision Register</h1>
          <p className="text-sm text-muted-foreground">{decisions.length} decision{decisions.length === 1 ? "" : "s"} recorded</p>
        </div>
        <FormDialog triggerLabel="Record Decision" title="Record a Decision" submitLabel="Record" action={createDecisionAction}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="rationale">Rationale</Label><Textarea id="rationale" name="rationale" rows={2} /></div>
          <div className="flex flex-col gap-1.5">
            <Label>Related Initiative</Label>
            <Select name="initiative_id">
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{initiatives.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select name="status" defaultValue="approved">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Optional: create a follow-up task from this decision</p>
            <div className="flex flex-col gap-1.5"><Label htmlFor="follow_up_task_title">Follow-up Task Title</Label><Input id="follow_up_task_title" name="follow_up_task_title" placeholder="Requires a related initiative above" /></div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="follow_up_due_date">Due Date</Label><Input id="follow_up_due_date" name="follow_up_due_date" type="date" /></div>
              <div className="flex flex-col gap-1.5">
                <Label>Responsible</Label>
                <Select name="follow_up_responsible_id">
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </FormDialog>
      </div>

      {decisions.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No decisions recorded yet.</p>}

      <div className="flex flex-col gap-3">
        {decisions.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex flex-col gap-1.5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.title}</span>
                <Badge variant="secondary" className="capitalize">{d.status}</Badge>
              </div>
              {d.description && <p className="text-muted-foreground">{d.description}</p>}
              <p className="text-xs text-muted-foreground">
                {d.decision_date} · {d.decided_by_profile?.full_name}
                {d.initiative ? ` · ${(d.initiative as { name?: string }).name}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
