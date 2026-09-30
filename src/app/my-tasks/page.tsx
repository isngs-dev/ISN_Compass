import Image from "next/image";
import { LogOut } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/server/auth/session";
import { signOutAction } from "@/server/actions/auth";
import { getTeamMemberTasks } from "@/server/services/team-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { CompleteTaskButton } from "@/components/member/complete-task-button";
import { isTaskOverdue } from "@/lib/utils";

export default async function MyTasksPage() {
  const { user, member } = await requireMember();
  const tasks = member ? await getTeamMemberTasks(member.id, createAdminClient()) : [];

  // Group by initiative, keeping the due-date order within each group.
  const groups = new Map<string, { name: string; tasks: typeof tasks }>();
  for (const t of tasks) {
    const initiative = t.initiative as { id: string; name: string } | null;
    const key = initiative?.id ?? "none";
    if (!groups.has(key)) groups.set(key, { name: initiative?.name ?? "No initiative", tasks: [] });
    groups.get(key)!.tasks.push(t);
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <Image src="/isn-logo.png" alt="ISN" width={250} height={96} className="h-7 w-auto" priority />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{member?.name ?? user.email}</span>
          <form action={signOutAction}>
            <Button type="submit" size="sm" variant="outline" className="gap-1.5">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground">Mark a task as completed once it&apos;s done — the Admin is notified.</p>
        </div>

        {!member && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Your login doesn&apos;t have access right now. Please contact the Admin.</CardContent></Card>
        )}
        {member && tasks.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No tasks assigned to you.</CardContent></Card>
        )}

        {[...groups.entries()].map(([key, group]) => (
          <Card key={key}>
            <CardHeader><CardTitle className="text-base">{group.name}</CardTitle></CardHeader>
            <CardContent className="flex flex-col divide-y">
              {group.tasks.map((t) => {
                const done = t.status === "completed" || t.status === "completion_confirmed";
                return (
                  <div key={t.id} className="flex flex-wrap items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{t.name}</div>
                      {t.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{t.description}</p>}
                      {t.assignment_note && <p className="mt-1 text-xs text-muted-foreground">Admin&apos;s instructions: {t.assignment_note}</p>}
                      <div className="mt-1 text-xs text-muted-foreground">{t.due_date ? `Due ${t.due_date}` : "No due date"}</div>
                    </div>
                    <PriorityBadge priority={t.priority} />
                    <TaskStatusBadge status={t.status} overdue={isTaskOverdue(t.due_date, t.status)} />
                    {!done && <CompleteTaskButton taskId={t.id} taskName={t.name} />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
