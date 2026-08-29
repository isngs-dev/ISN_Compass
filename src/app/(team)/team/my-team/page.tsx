import { requireUser } from "@/server/auth/session";
import { getTeamWorkload } from "@/server/services/dashboard";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyTeamPage() {
  const user = await requireUser();
  const workload = await getTeamWorkload(user.id);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Team</h1>
        <p className="text-sm text-muted-foreground">Workload across your direct reports</p>
      </div>

      {workload.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No direct reports found.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workload.map((w) => (
          <Card key={w.user.id}>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="font-medium">{w.user.full_name}</div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="text-lg font-semibold">{w.open}</div>
                  <div className="text-xs text-muted-foreground">Open</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{w.overdue}</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-amber-600">{w.blocked}</div>
                  <div className="text-xs text-muted-foreground">Blocked</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
