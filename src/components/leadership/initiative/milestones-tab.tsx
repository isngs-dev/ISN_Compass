"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FormDialog } from "@/components/shared/form-dialog";
import { createMilestoneAction, updateMilestoneStatusAction } from "@/server/actions/milestones";
import { InitiativeStatusBadge, PriorityBadge } from "@/components/shared/badges";

interface MilestoneRow {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  status: string;
  weight: number;
  completion_percentage: number;
  priority: string;
  owner: { full_name: string } | null;
}

export function MilestonesTab({
  initiativeId,
  milestones,
  members,
}: {
  initiativeId: string;
  milestones: MilestoneRow[];
  members: { id: string; full_name: string }[];
}) {
  const totalWeight = milestones.reduce((s, m) => s + Number(m.weight), 0);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Weights sum to {totalWeight}% {totalWeight !== 100 && milestones.length > 0 && "(should total 100% for accurate roll-up)"}
        </p>
        <FormDialog
          triggerLabel="New Milestone"
          title="Create Milestone"
          submitLabel="Create"
          action={(fd) => createMilestoneAction(initiativeId, fd)}
        >
          <div className="flex flex-col gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" name="due_date" type="date" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="weight">Weight (% of initiative)</Label><Input id="weight" name="weight" type="number" min={0} max={100} defaultValue={0} /></div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Owner</Label>
            <Select name="owner_id">
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select name="priority" defaultValue="p3_normal">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="p1_critical">P1 Critical</SelectItem>
                <SelectItem value="p2_high">P2 High</SelectItem>
                <SelectItem value="p3_normal">P3 Normal</SelectItem>
                <SelectItem value="p4_low">P4 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormDialog>
      </div>

      {milestones.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No milestones yet.</p>}

      <div className="flex flex-col gap-3">
        {milestones.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{m.name}</div>
                  {m.description && <div className="text-sm text-muted-foreground">{m.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={m.priority as never} />
                  <Select
                    defaultValue={m.status}
                    disabled={pending}
                    onValueChange={(v) => v && startTransition(async () => {
                      try { await updateMilestoneStatusAction(initiativeId, m.id, v); toast.success("Status updated"); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                    })}
                  >
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Weight {m.weight}%</span>
                {m.due_date && <span>Due {m.due_date}</span>}
                <span>Owner: {m.owner?.full_name ?? "Unassigned"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={m.completion_percentage} className="h-2 flex-1" />
                <span className="text-xs font-medium">{Math.round(m.completion_percentage)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
