import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listTasksForUser } from "@/server/services/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";
import type { TaskStatus } from "@/types/domain";

const STATUSES: TaskStatus[] = ["not_started", "in_progress", "blocked", "completed", "deferred", "cancelled"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const allTasks = await listTasksForUser(user.id);
  const tasks = sp.status ? allTasks.filter((t) => t.status === sp.status) : allTasks;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">All tasks you&apos;re responsible for or contributing to</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/team/tasks">
          <FilterChip label="All" active={!sp.status} />
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/team/tasks?status=${s}`}>
            <FilterChip label={s.replace("_", " ")} active={sp.status === s} />
          </Link>
        ))}
      </div>

      {tasks.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No tasks match this filter.</p>}

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {tasks.map((task) => (
            <Link key={task.id} href={`/team/tasks/${task.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{task.title}</div>
                <div className="text-xs text-muted-foreground">
                  {task.initiative?.name ?? "—"} · {task.my_role}
                  {task.due_date ? ` · Due ${task.due_date}` : ""}
                </div>
              </div>
              <PriorityBadge priority={task.priority as never} className="hidden sm:inline-flex" />
              <TaskStatusBadge status={task.status as never} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </span>
  );
}
