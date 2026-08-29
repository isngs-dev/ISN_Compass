import { requireUser } from "@/server/auth/session";
import { listEscalations } from "@/server/services/governance";
import { createEscalationAction } from "@/server/actions/governance";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/shared/form-dialog";

export default async function BlockersPage() {
  const user = await requireUser();
  const all = await listEscalations();
  const mine = all.filter((e) => e.raised_by === user.id || e.assigned_to === user.id);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blockers</h1>
          <p className="text-sm text-muted-foreground">Escalations you&apos;ve raised or that are assigned to you</p>
        </div>
        <FormDialog triggerLabel="Raise Blocker" title="Raise Escalation" submitLabel="Escalate" action={createEscalationAction}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select name="category" defaultValue="other">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="resource">Resource</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="dependency">Dependency</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Escalate to</Label>
              <Select name="level" defaultValue="manager">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="leadership">Leadership</SelectItem>
                  <SelectItem value="critical_leadership">Critical (Leadership)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormDialog>
      </div>

      {mine.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No blockers raised.</p>}

      <div className="flex flex-col gap-3">
        {mine.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-col gap-1.5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{e.title}</span>
                <Badge variant={e.status === "open" ? "destructive" : "secondary"} className="capitalize">{e.status}</Badge>
              </div>
              {e.description && <p className="text-muted-foreground">{e.description}</p>}
              <p className="text-xs text-muted-foreground capitalize">{e.category} · {e.level.replace("_", " ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
