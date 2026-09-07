"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  updateInitiativeAction,
  setInitiativeStatusAction,
  archiveInitiativeAction,
  unarchiveInitiativeAction,
  deleteInitiativeAction,
} from "@/server/actions/initiatives";
import type { Initiative, InitiativeStatus } from "@/types/database";

const STATUSES: InitiativeStatus[] = ["not_started", "active", "on_hold", "completed"];
// Base UI's <Select.Value> renders the raw value unless the Select is given `items` to
// resolve a label from — needed here since these selects start pre-filled from existing data.
const STATUS_ITEMS = STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }));

export function OverviewTab({
  initiative,
  departments,
}: {
  initiative: Initiative & { department: { id: string; name: string } | null };
  departments: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function handleDeleteConfirmed() {
    startTransition(async () => {
      try {
        await deleteInitiativeAction(initiative.id);
        toast.success("Deleted");
        router.push("/initiatives");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
        setConfirmOpen(false);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 py-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">{initiative.description ?? "No description provided."}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Row label="Department" value={initiative.department?.name ?? "—"} />
          <Row label="Start Date" value={initiative.start_date ?? "—"} />
          <Row label="Target Date" value={initiative.target_date ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Select
            defaultValue={initiative.status}
            items={STATUS_ITEMS}
            disabled={pending}
            onValueChange={(v) =>
              startTransition(async () => {
                try {
                  await setInitiativeStatusAction(initiative.id, v as InitiativeStatus);
                  toast.success("Status updated");
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await (initiative.is_archived ? unarchiveInitiativeAction(initiative.id) : archiveInitiativeAction(initiative.id));
                toast.success(initiative.is_archived ? "Unarchived" : "Archived");
                router.refresh();
              })
            }
          >
            {initiative.is_archived ? "Unarchive" : "Archive"}
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => setConfirmOpen(true)}>
            Delete Forever
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Delete initiative?"
            description={`Permanently delete "${initiative.name}" and all its tasks. This can't be undone.`}
            pending={pending}
            onConfirm={handleDeleteConfirmed}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Edit</CardTitle></CardHeader>
        <CardContent>
          <FormDialog triggerLabel="Edit Initiative" title="Edit Initiative" submitLabel="Save" action={(fd) => updateInitiativeAction(initiative.id, fd)}>
            <div className="flex flex-col gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={initiative.name} required /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={3} defaultValue={initiative.description ?? ""} /></div>
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Select
                name="department_id"
                defaultValue={initiative.department_id}
                items={departments.map((d) => ({ value: d.id, label: d.name }))}
                required
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="start_date">Start Date</Label><Input id="start_date" name="start_date" type="date" defaultValue={initiative.start_date ?? ""} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="target_date">Target Date</Label><Input id="target_date" name="target_date" type="date" defaultValue={initiative.target_date ?? ""} /></div>
            </div>
          </FormDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
