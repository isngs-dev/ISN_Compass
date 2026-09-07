import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamMember, getTeamMemberTasks } from "@/server/services/team-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { isTaskOverdue } from "@/lib/utils";

export default async function TeamMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getTeamMember(id).catch(() => null);
  if (!member) notFound();

  const tasks = await getTeamMemberTasks(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
        <p className="text-sm text-muted-foreground">
          {member.email} · {(member.department as { name?: string } | null)?.name ?? "No department"}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Assigned Tasks ({tasks.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1">
          {tasks.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No tasks assigned.</p>}
          {tasks.map((t) => {
            const overdue = isTaskOverdue(t.due_date, t.status);
            return (
              <Link
                key={t.id}
                href={`/initiatives/${(t.initiative as { id?: string } | null)?.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(t.initiative as { name?: string } | null)?.name}
                    {t.due_date ? ` · Due ${t.due_date}` : ""}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} className="hidden sm:inline-flex" />
                <TaskStatusBadge status={t.status} overdue={overdue} />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
