import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityLogEntry } from "@/types/database";

const ACTION_LABELS: Record<string, string> = {
  initiative_created: "Initiative created",
  initiative_status_changed: "Status changed",
  initiative_archived: "Archived",
  initiative_unarchived: "Unarchived",
  task_created: "Task created",
  task_assigned: "Task assigned",
  task_reassigned: "Task reassigned",
  task_status_changed: "Status changed",
  completion_confirmation_received: "Completion confirmed",
  task_marked_completed: "Marked completed",
  task_reopened: "Task reopened",
};

export function ActivityTab({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
              <span>{entry.description}</span>
              <span className="text-xs text-muted-foreground">— {entry.actor}</span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
