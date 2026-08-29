"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  overrideHealthAction,
  clearHealthOverrideAction,
  reassignOwnerAction,
} from "@/server/actions/initiatives";
import type { HealthStatus } from "@/types/domain";

interface InitiativeLike {
  id: string;
  description: string | null;
  budget: number | null;
  revenue_opportunity: number | null;
  cost_saving_opportunity: number | null;
  health_overridden: boolean;
  health_override_reason: string | null;
  members: { member_role: string; user: { id: string; full_name: string } | null }[];
}

export function OverviewTab({
  initiative,
  members,
}: {
  initiative: InitiativeLike;
  members: { id: string; full_name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const owner = initiative.members.find((m) => m.member_role === "accountable_owner");
  const contributors = initiative.members.filter((m) => m.member_role === "contributor");

  return (
    <div className="grid grid-cols-1 gap-4 py-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">{initiative.description ?? "No description provided."}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Financials</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Row label="Budget" value={initiative.budget} />
          <Row label="Revenue Opportunity" value={initiative.revenue_opportunity} />
          <Row label="Cost Saving Opportunity" value={initiative.cost_saving_opportunity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Accountability</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Accountable Owner</span>
            <span className="font-medium">{owner?.user?.full_name ?? "Unassigned"}</span>
          </div>
          <form
            action={(fd) => startTransition(async () => {
              try { await reassignOwnerAction(initiative.id, fd); toast.success("Owner updated"); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            })}
            className="flex items-center gap-2"
          >
            <Select name="owner_id">
              <SelectTrigger className="h-8"><SelectValue placeholder="Reassign owner" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={pending} type="submit">Set</Button>
          </form>
          {contributors.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Contributors</div>
              <div className="flex flex-wrap gap-1">
                {contributors.map((c) => <span key={c.user?.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{c.user?.full_name}</span>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Health Override</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {initiative.health_overridden ? (
            <>
              <p className="text-muted-foreground">Manually overridden: {initiative.health_override_reason}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => startTransition(async () => {
                  await clearHealthOverrideAction(initiative.id);
                  toast.success("Override cleared — health will recompute automatically");
                })}
              >
                Clear override
              </Button>
            </>
          ) : (
            <FormDialog
              triggerLabel="Override Health"
              title="Manually Override Initiative Health"
              description="Requires a reason. Recorded in audit history."
              submitLabel="Apply Override"
              action={(fd) => overrideHealthAction(initiative.id, fd)}
            >
              <div className="flex flex-col gap-1.5">
                <Label>Health</Label>
                <Select name="health" required defaultValue={"amber" as HealthStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">Green — On Track</SelectItem>
                    <SelectItem value="amber">Amber — At Risk</SelectItem>
                    <SelectItem value="red">Red — Critical</SelectItem>
                    <SelectItem value="grey">Grey — On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" name="reason" required rows={3} />
              </div>
            </FormDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value != null ? `₹${Number(value).toLocaleString()}` : "—"}</span>
    </div>
  );
}
