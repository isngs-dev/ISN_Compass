import { listActivity } from "@/server/services/activity";
import { ActivityTab } from "@/components/initiative/activity-tab";

export default async function ActivityPage() {
  const entries = await listActivity();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">A running history of what&apos;s happened across initiatives and tasks.</p>
      </div>
      <ActivityTab entries={entries} />
    </div>
  );
}
