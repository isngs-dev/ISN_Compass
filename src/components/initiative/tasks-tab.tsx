"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  createTaskAction,
  updateTaskAction,
  reassignTaskAction,
  markTaskCompletedAction,
  reopenTaskAction,
  deleteTaskAction,
} from "@/server/actions/tasks";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { isTaskOverdue } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types/database";

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

export function TasksTab({
  initiativeId,
  tasks,
  members,
}: {
  initiativeId: string;
  tasks: TaskRow[];
  members: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex justify-end">
        <FormDialog triggerLabel="New Task" title="Create Task" submitLabel="Create" action={(fd) => createTaskAction(initiativeId, fd)}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="name">Task Name</Label><Input id="name" name="name" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
          <div className="flex flex-col gap-1.5">
            <Label>Assign To</Label>
            <Select name="assigned_to" items={members.map((m) => ({ value: m.id, label: m.name }))}>
              <SelectTrigger><SelectValue placeholder="Optional — assign now or later" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="assignment_note">Instructions</Label><Textarea id="assignment_note" name="assignment_note" rows={2} placeholder="Included in the assignment email" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="start_date">Start Date</Label><Input id="start_date" name="start_date" type="date" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" name="due_date" type="date" /></div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select name="priority" defaultValue={"medium" satisfies TaskPriority} items={PRIORITY_ITEMS}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormDialog>
      </div>

      {tasks.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No tasks yet.</p>}

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {tasks.map((t) => (
            <TaskRowItem key={t.id} task={t} initiativeId={initiativeId} members={members} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskRowItem({
  task,
  initiativeId,
  members,
}: {
  task: TaskRow;
  initiativeId: string;
  members: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const overdue = isTaskOverdue(task.due_date, task.status);

  function run(fn: () => Promise<void>, successMessage = "Updated") {
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMessage);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setConfirmOpen(false);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.name}</div>
        <div className="text-xs text-muted-foreground">
          {task.assignee?.name ?? "Unassigned"}
          {task.due_date ? ` · Due ${task.due_date}` : ""}
        </div>
        {task.description && <div className="truncate text-xs text-muted-foreground/80">{task.description}</div>}
      </div>
      <PriorityBadge priority={task.priority} className="hidden sm:inline-flex" />
      <TaskStatusBadge status={task.status} overdue={overdue} />

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
          <Label htmlFor={`note-${task.id}`}>Instructions</Label>
          <Textarea id={`note-${task.id}`} name="assignment_note" rows={2} defaultValue={task.assignment_note ?? ""} />
        </div>
      </FormDialog>

      {task.status === "completion_confirmed" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => markTaskCompletedAction(task.id, initiativeId))}>
          Mark Completed
        </Button>
      )}
      {(task.status === "completion_confirmed" || task.status === "completed") && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reopenTaskAction(task.id, initiativeId))}>
          Reopen
        </Button>
      )}
      <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => setConfirmOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete task?"
        description={`Permanently delete "${task.name}". This can't be undone.`}
        pending={pending}
        onConfirm={() => run(() => deleteTaskAction(task.id, initiativeId), "Deleted")}
      />
    </div>
  );
}
