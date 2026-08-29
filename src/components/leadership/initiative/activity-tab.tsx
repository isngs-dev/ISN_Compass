import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditLogRow {
  id: string;
  action: string;
  previous_value: unknown;
  new_value: unknown;
  reason: string | null;
  created_at: string;
  actor: { full_name: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  status_changed: "Status changed",
  delegated: "Delegated",
  assigned: "Assigned",
  approved: "Approved",
  escalated: "Escalated",
  health_overridden: "Health overridden",
  health_override_cleared: "Health override cleared",
  owner_reassigned: "Owner reassigned",
};

function formatValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function ActivityTab({ auditLog }: { auditLog: AuditLogRow[] }) {
  if (auditLog.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {auditLog.map((entry) => {
        const prev = formatValue(entry.previous_value);
        const next = formatValue(entry.new_value);
        return (
          <Card key={entry.id}>
            <CardContent className="flex flex-col gap-1.5 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                  <span className="font-medium">{entry.actor?.full_name ?? "System"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
              {(prev || next) && (
                <p className="text-xs text-muted-foreground">
                  {prev && <span>{prev}</span>}
                  {prev && next && <span> → </span>}
                  {next && <span>{next}</span>}
                </p>
              )}
              {entry.reason && <p className="text-xs text-muted-foreground">Reason: {entry.reason}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
