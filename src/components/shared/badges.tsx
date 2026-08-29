import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HealthStatus, PriorityLevel, TaskStatus, InitiativeStatus } from "@/types/domain";

const HEALTH_STYLES: Record<HealthStatus, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  grey: "bg-zinc-100 text-zinc-700 border-zinc-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  green: "On Track",
  amber: "At Risk",
  red: "Critical",
  grey: "On Hold",
  blue: "Completed",
};

export function HealthBadge({ health, className }: { health: HealthStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", HEALTH_STYLES[health], className)}>
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-emerald-500": health === "green",
          "bg-amber-500": health === "amber",
          "bg-red-500": health === "red",
          "bg-zinc-400": health === "grey",
          "bg-blue-500": health === "blue",
        })}
      />
      {HEALTH_LABELS[health]}
    </Badge>
  );
}

const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  p1_critical: "bg-red-100 text-red-800 border-red-200",
  p2_high: "bg-orange-100 text-orange-800 border-orange-200",
  p3_normal: "bg-zinc-100 text-zinc-700 border-zinc-200",
  p4_low: "bg-zinc-50 text-zinc-500 border-zinc-200",
};
const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  p1_critical: "P1 Critical",
  p2_high: "P2 High",
  p3_normal: "P3 Normal",
  p4_low: "P4 Low",
};
export function PriorityBadge({ priority, className }: { priority: PriorityLevel; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PRIORITY_STYLES[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-zinc-100 text-zinc-700 border-zinc-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  blocked: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  deferred: "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200 line-through",
};
const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  completed: "Completed",
  deferred: "Deferred",
  cancelled: "Cancelled",
};
export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TASK_STATUS_STYLES[status], className)}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};
export function InitiativeStatusBadge({ status, className }: { status: InitiativeStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", className)}>
      {INITIATIVE_STATUS_LABELS[status]}
    </Badge>
  );
}
