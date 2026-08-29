"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { createTaskAction } from "@/server/actions/tasks";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  percentage_complete: number;
  milestone: { name: string } | null;
  assignments: { assignment_role: string; user: { full_name: string } | null }[];
}

export function TasksTab({
  initiativeId,
  tasks,
  milestones,
  members,
}: {
  initiativeId: string;
  tasks: TaskRow[];
  milestones: { id: string; name: string }[];
  members: { id: string; full_name: string }[];
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex justify-end">
        <FormDialog
          triggerLabel="New Task"
          title="Create Task"
          submitLabel="Create"
          action={(fd) => createTaskAction(initiativeId, fd)}
        >
          <div className="flex flex-col gap-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
          <div className="flex flex-col gap-1.5">
            <Label>Milestone</Label>
            <Select name="milestone_id">
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{milestones.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" name="due_date" type="date" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="weight">Weight (%)</Label><Input id="weight" name="weight" type="number" min={0} max={100} defaultValue={0} /></div>
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
          <div className="flex flex-col gap-1.5">
            <Label>Responsible Person</Label>
            <Select name="responsible_id">
              <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </FormDialog>
      </div>

      {tasks.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No tasks yet.</p>}

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {tasks.map((t) => {
            const responsible = t.assignments.find((a) => a.assignment_role === "responsible");
            return (
              <Link key={t.id} href={`/team/tasks/${t.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.milestone?.name ?? "No milestone"} · {responsible?.user?.full_name ?? "Unassigned"}
                    {t.due_date ? ` · Due ${t.due_date}` : ""}
                  </div>
                </div>
                <PriorityBadge priority={t.priority as never} className="hidden sm:inline-flex" />
                <TaskStatusBadge status={t.status as never} />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
