import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listMyTasks } from "@/server/services/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";

export default async function MyWorkPage() {
  const user = await requireUser();
  const tasks = await listMyTasks(user.id);

  const open = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const overdue = open.filter((t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10));

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Work</h1>
        <p className="text-sm text-muted-foreground">
          {open.length} open · {overdue.length} overdue · {tasks.length} total
        </p>
      </div>

      {tasks.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No tasks assigned to you yet.</p>}

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {tasks.map((t) => (
            <Link key={t.id} href={`/team/tasks/${t.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t.initiative?.name ?? "—"}
                  {t.due_date ? ` · Due ${t.due_date}` : ""}
                </div>
              </div>
              <PriorityBadge priority={t.priority as never} className="hidden sm:inline-flex" />
              <TaskStatusBadge status={t.status as never} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
