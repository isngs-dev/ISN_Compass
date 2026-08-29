import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listDelegatedByMe } from "@/server/services/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge } from "@/components/shared/badges";

export default async function DelegatedPage() {
  const user = await requireUser();
  const delegations = await listDelegatedByMe(user.id);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Delegated</h1>
        <p className="text-sm text-muted-foreground">Tasks you&apos;ve delegated — you remain accountable</p>
      </div>

      {delegations.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">You haven&apos;t delegated any tasks.</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-1 p-2">
            {delegations.map((d) => (
              <Link key={d.id} href={`/team/tasks/${d.task?.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.task?.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Delegated to {d.delegated_to_profile?.full_name}
                    {d.delegated_due_date ? ` · Due ${d.delegated_due_date}` : ""}
                  </div>
                </div>
                {d.task?.status && <TaskStatusBadge status={d.task.status as never} />}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
