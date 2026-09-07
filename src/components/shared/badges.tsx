import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InitiativeStatus, TaskPriority, TaskStatus } from "@/types/database";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-zinc-100 text-zinc-600 border-zinc-200",
};
const PRIORITY_LABELS: Record<TaskPriority, string> = { high: "High", medium: "Medium", low: "Low" };
export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PRIORITY_STYLES[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-zinc-100 text-zinc-700 border-zinc-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completion_confirmed: "bg-violet-100 text-violet-800 border-violet-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};
const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completion_confirmed: "Awaiting Review",
  completed: "Completed",
};
export function TaskStatusBadge({
  status,
  overdue,
  className,
}: {
  status: TaskStatus;
  overdue?: boolean;
  className?: string;
}) {
  if (overdue) {
    return (
      <Badge variant="outline" className={cn("font-medium border-red-200 bg-red-100 text-red-800", className)}>
        Overdue
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("font-medium", TASK_STATUS_STYLES[status], className)}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  not_started: "Not Started",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
};
export function InitiativeStatusBadge({ status, className }: { status: InitiativeStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", className)}>
      {INITIATIVE_STATUS_LABELS[status]}
    </Badge>
  );
}
