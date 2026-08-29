import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listTasksForUser } from "@/server/services/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge } from "@/components/shared/badges";

export default async function CalendarPage() {
  const user = await requireUser();
  const tasks = await listTasksForUser(user.id);

  const withDueDates = tasks
    .filter((t) => t.due_date && !["completed", "cancelled"].includes(t.status))
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">Upcoming due dates across your tasks</p>
      </div>

      {withDueDates.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nothing on your calendar.</p>}

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {withDueDates.map((t) => (
            <Link key={t.id} href={`/team/tasks/${t.id}`} className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
              <span className="truncate text-sm font-medium">{t.title}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${t.due_date! < today ? "font-medium text-red-600" : "text-muted-foreground"}`}>
                  {t.due_date}
                </span>
                <TaskStatusBadge status={t.status as never} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
