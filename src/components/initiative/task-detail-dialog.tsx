"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { ActivityTab } from "@/components/initiative/activity-tab";
import { updateTaskAction, reassignTaskAction, getTaskActivityAction } from "@/server/actions/tasks";
import { isTaskOverdue } from "@/lib/utils";
import type { ActivityLogEntry, Task, TaskPriority, TaskStatus } from "@/types/database";

interface TaskRow extends Task {
  assignee: { id: string; name: string } | null;
}

// Base UI's <Select.Value> renders the raw value unless the Select is given `items` to
// resolve a label from — needed wherever a select starts pre-filled (defaultValue).
const PRIORITY_ITEMS: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const STATUS_ITEMS: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completion_confirmed", label: "Completion Confirmed" },
  { value: "completed", label: "Completed" },
];

export function TaskDetailDialog({
  task,
  initiativeId,
  members,
  open,
  onOpenChange,
}: {
  task: TaskRow;
  initiativeId: string;
  members: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const overdue = isTaskOverdue(task.due_date, task.status);
  const [history, setHistory] = useState<ActivityLogEntry[]>([]);
  const [loadingHistory, startLoadingHistory] = useTransition();

  useEffect(() => {
    if (!open) return;
    // setHistory is only called inside the async callback (after the await), never
    // synchronously in the effect body, per react-hooks/set-state-in-effect.
    startLoadingHistory(async () => {
      setHistory(await getTaskActivityAction(task.id));
    });
    // task.updated_at (not just task.id) is in the dependency list so the history
    // list also refreshes after an edit closes its own dialog while this one stays open.
  }, [open, task.id, task.updated_at]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} overdue={overdue} />
          </div>

          {task.description && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <p className="text-sm">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Assigned To" value={task.assignee?.name ?? "Unassigned"} />
            <Field label="Due Date" value={task.due_date ?? "—"} />
            <Field label="Start Date" value={task.start_date ?? "—"} />
          </div>

          {task.assignment_note && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Instructions</span>
              <p className="text-sm">{task.assignment_note}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <FormDialog
              triggerLabel="Edit"
              title="Edit Task"
              submitLabel="Save"
              action={(fd) => updateTaskAction(task.id, initiativeId, fd)}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`name-${task.id}`}>Task Name</Label>
                <Input id={`name-${task.id}`} name="name" defaultValue={task.name} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`description-${task.id}`}>Description</Label>
                <Textarea id={`description-${task.id}`} name="description" rows={2} defaultValue={task.description ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`start-${task.id}`}>Start Date</Label>
                  <Input id={`start-${task.id}`} name="start_date" type="date" defaultValue={task.start_date ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`due-${task.id}`}>Due Date</Label>
                  <Input id={`due-${task.id}`} name="due_date" type="date" defaultValue={task.due_date ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue={task.priority} items={PRIORITY_ITEMS}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={task.status} items={STATUS_ITEMS}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_ITEMS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`note-${task.id}`}>Add a Note</Label>
                <Textarea id={`note-${task.id}`} name="note" rows={2} placeholder="Optional — recorded in this task's history" />
              </div>
            </FormDialog>

            <FormDialog
              triggerLabel={task.assignee ? "Reassign" : "Assign"}
              title="Assign Task"
              submitLabel="Assign"
              action={(fd) => reassignTaskAction(task.id, initiativeId, fd)}
            >
              <div className="flex flex-col gap-1.5">
                <Label>Team Member</Label>
                <Select
                  name="assigned_to"
                  defaultValue={task.assigned_to ?? undefined}
                  items={members.map((m) => ({ value: m.id, label: m.name }))}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`assign-note-${task.id}`}>Instructions</Label>
                <Textarea id={`assign-note-${task.id}`} name="assignment_note" rows={2} defaultValue={task.assignment_note ?? ""} />
              </div>
            </FormDialog>
          </div>

          <div className="border-t pt-2">
            <span className="text-xs font-medium text-muted-foreground">History</span>
            {loadingHistory ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <ActivityTab entries={history} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
