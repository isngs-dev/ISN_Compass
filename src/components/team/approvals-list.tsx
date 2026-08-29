"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { decideApprovalAction } from "@/server/actions/governance";

interface ApprovalRow {
  id: string;
  entity_type: string;
  entity_label: string | undefined;
  status: string;
  requested_at: string;
  requested_by_profile: { full_name: string } | null;
}

export function ApprovalsList({ approvals }: { approvals: ApprovalRow[] }) {
  const [pending, startTransition] = useTransition();

  function decide(id: string, status: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await decideApprovalAction(id, status);
        toast.success(status === "approved" ? "Approved" : "Rejected");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  if (approvals.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No approvals pending.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {approvals.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex items-center justify-between gap-3 py-4 text-sm">
            <div>
              <div className="font-medium capitalize">{a.entity_type}: {a.entity_label ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                Requested by {a.requested_by_profile?.full_name} on {new Date(a.requested_at).toLocaleDateString()}
              </div>
            </div>
            {a.status === "pending" ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => decide(a.id, "rejected")}>Reject</Button>
                <Button size="sm" disabled={pending} onClick={() => decide(a.id, "approved")}>Approve</Button>
              </div>
            ) : (
              <Badge variant="secondary" className="capitalize">{a.status}</Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
