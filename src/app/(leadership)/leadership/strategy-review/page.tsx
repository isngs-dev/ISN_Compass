import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listMeetings } from "@/server/services/meetings";
import { startMeetingAction } from "@/server/actions/meetings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function StrategyReviewPage() {
  const user = await requireUser();
  const meetings = await listMeetings(user.profile.organization_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Strategy Review</h1>
          <p className="text-sm text-muted-foreground">Weekly meetings with a &quot;since last meeting&quot; auto-generated agenda</p>
        </div>
        <form action={startMeetingAction}>
          <Button type="submit">Start Meeting</Button>
        </form>
      </div>

      {meetings.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No strategy reviews yet.</p>}

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {meetings.map((m) => (
            <Link key={m.id} href={`/leadership/strategy-review/${m.id}`} className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
              <div>
                <div className="text-sm font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.meeting_date} · {m.created_by_profile?.full_name}</div>
              </div>
              <Badge variant={m.status === "completed" ? "secondary" : "default"} className="capitalize">{m.status.replace("_", " ")}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
