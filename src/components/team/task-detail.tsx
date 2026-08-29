"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FormDialog } from "@/components/shared/form-dialog";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";
import {
  updateTaskStatusAction,
  addTaskUpdateAction,
  delegateTaskAction,
  setTaskDueDateAction,
} from "@/server/actions/tasks";
import { createEscalationAction } from "@/server/actions/governance";
import type { TaskStatus } from "@/types/domain";

interface TaskDetailProps {
  task: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    original_due_date: string | null;
    extension_count: number;
    weight: number;
    percentage_complete: number;
    initiative_id: string;
    initiative: { id: string; name: string; code: string } | null;
    milestone: { id: string; name: string } | null;
    assignments: { id: string; assignment_role: string; is_active: boolean; user: { id: string; full_name: string } | null }[];
    subtasks: { id: string; title: string; status: string; percentage_complete: number }[];
    updates: {
      id: string;
      note: string;
      percentage_complete: number | null;
      status_at_update: string | null;
      created_at: string;
      author: { full_name: string } | null;
    }[];
  };
  members: { id: string; full_name: string }[];
}

export function TaskDetail({ task, members }: TaskDetailProps) {
  const [pending, startTransition] = useTransition();
  const activeAssignments = task.assignments.filter((a) => a.is_active);
  const responsible = activeAssignments.find((a) => a.assignment_role === "responsible");
  const contributors = activeAssignments.filter((a) => a.assignment_role === "contributor");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{task.code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <p className="text-sm text-muted-foreground">
            {task.initiative && (
              <Link href={`/leadership/initiatives/${task.initiative.id}`} className="underline-offset-2 hover:underline">
                {task.initiative.name}
              </Link>
            )}
            {task.milestone ? ` · ${task.milestone.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority as never} />
          <TaskStatusBadge status={task.status as never} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{task.description ?? "No description provided."}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status & Progress</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Select
              defaultValue={task.status}
              disabled={pending}
              onValueChange={(v) => startTransition(async () => {
                try { await updateTaskStatusAction(task.id, v as TaskStatus); toast.success("Status updated"); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              })}
            >
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Progress value={task.percentage_complete} className="h-2 flex-1" />
              <span className="text-xs font-medium">{Math.round(task.percentage_complete)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Weight {task.weight}%</span>
              <span>Due {task.due_date ?? "—"}{task.extension_count > 0 ? ` (extended ${task.extension_count}x)` : ""}</span>
            </div>
            <FormDialog
              triggerLabel="Change Due Date"
              title="Change Due Date"
              description="Requires a reason. Recorded in audit history."
              submitLabel="Update"
              action={(fd) => setTaskDueDateAction(task.id, fd)}
            >
              <div className="flex flex-col gap-1.5"><Label htmlFor="due_date">New Due Date</Label><Input id="due_date" name="due_date" type="date" required /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="reason">Reason</Label><Textarea id="reason" name="reason" required rows={3} /></div>
            </FormDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assignments</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Responsible</span>
              <span className="font-medium">{responsible?.user?.full_name ?? "Unassigned"}</span>
            </div>
            {contributors.length > 0 && (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Contributors</div>
                <div className="flex flex-wrap gap-1">
                  {contributors.map((c) => (
                    <span key={c.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{c.user?.full_name}</span>
                  ))}
                </div>
              </div>
            )}
            <FormDialog
              triggerLabel="Delegate"
              title="Delegate Task"
              description="Execution moves to the delegate. Accountability remains with you."
              submitLabel="Delegate"
              action={(fd) => delegateTaskAction(task.id, fd)}
            >
              <div className="flex flex-col gap-1.5">
                <Label>Delegate to</Label>
                <Select name="delegated_to" required>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="delegated_due_date">Due Date</Label><Input id="delegated_due_date" name="delegated_due_date" type="date" /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="instructions">Instructions</Label><Textarea id="instructions" name="instructions" rows={2} /></div>
            </FormDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Blocked?</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">Raise a blocker to escalate this task to your manager or leadership.</p>
            <FormDialog
              triggerLabel="Raise Blocker"
              title="Raise Escalation"
              submitLabel="Escalate"
              action={(fd) => createEscalationAction(fd)}
            >
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="initiative_id" value={task.initiative_id} />
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
          </CardContent>
        </Card>
      </div>

      {task.subtasks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Subtasks</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1 p-2">
            {task.subtasks.map((s) => (
              <Link key={s.id} href={`/team/tasks/${s.id}`} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted">
                <span className="truncate">{s.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{Math.round(s.percentage_complete)}%</span>
                  <TaskStatusBadge status={s.status as never} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Post an Update</CardTitle></CardHeader>
        <CardContent>
          <form
            action={(fd) => startTransition(async () => {
              try {
                await addTaskUpdateAction(task.id, fd);
                toast.success("Update posted");
                (document.getElementById("task-update-form") as HTMLFormElement)?.reset();
              } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            })}
            id="task-update-form"
            className="flex flex-col gap-3"
          >
            <Textarea name="note" placeholder="What's the latest on this task?" rows={2} required />
            <div className="flex items-center gap-3">
              <Input name="percentage_complete" type="number" min={0} max={100} placeholder="% complete" className="w-32" />
              <Button type="submit" size="sm" disabled={pending} className="ml-auto">
                {pending ? "Posting…" : "Post Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {task.updates.length > 0 && (
        <div className="flex flex-col gap-3">
          {task.updates.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{u.author?.full_name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</span>
                </div>
                <p>{u.note}</p>
                {u.percentage_complete != null && <p className="text-xs text-muted-foreground">Progress: {u.percentage_complete}%</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
