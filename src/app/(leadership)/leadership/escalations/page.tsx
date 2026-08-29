import { listEscalations } from "@/server/services/governance";
import { resolveEscalationAction } from "@/server/actions/governance";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function EscalationsPage() {
  const escalations = await listEscalations();
  const open = escalations.filter((e) => e.status === "open" || e.status === "acknowledged");
  const resolved = escalations.filter((e) => e.status === "resolved" || e.status === "closed");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Escalations</h1>
        <p className="text-sm text-muted-foreground">{open.length} open · {resolved.length} resolved</p>
      </div>

      {open.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No open escalations.</p>}

      <div className="flex flex-col gap-3">
        {open.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-col gap-2 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{e.title}</span>
                <Badge variant="destructive" className="capitalize">{e.level.replace("_", " ")}</Badge>
              </div>
              {e.description && <p className="text-muted-foreground">{e.description}</p>}
              <p className="text-xs text-muted-foreground">
                Raised by {e.raised_by_profile?.full_name}
                {e.initiative ? ` · ${(e.initiative as { name?: string }).name}` : ""} · {e.category}
              </p>
              <form action={resolveEscalationAction.bind(null, e.id)} className="flex items-center gap-2">
                <Input name="resolution_note" placeholder="Resolution note" className="h-8" required />
                <Button type="submit" size="sm" variant="outline">Resolve</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>

      {resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Resolved</h2>
          {resolved.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <span>{e.title}</span>
                <Badge variant="secondary" className="capitalize">{e.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
