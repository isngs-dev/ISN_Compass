"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitInitiativeUpdateAction } from "@/server/actions/initiatives";

interface UpdateRow {
  id: string;
  completed_summary: string | null;
  in_progress_summary: string | null;
  next_steps: string | null;
  blockers: string | null;
  confidence: string;
  needs_management_support: boolean;
  created_at: string;
  author: { full_name: string } | null;
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-800",
};

export function UpdatesTab({ initiativeId, updates }: { initiativeId: string; updates: UpdateRow[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4 py-4">
      <Card>
        <CardContent className="py-4">
          <p className="mb-3 text-sm font-medium">Submit Check-in</p>
          <form
            action={(fd) => startTransition(async () => {
              try {
                await submitInitiativeUpdateAction(initiativeId, fd);
                toast.success("Update submitted");
                (document.getElementById("update-form") as HTMLFormElement)?.reset();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            })}
            id="update-form"
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor="completed_summary">What was completed?</Label><Textarea id="completed_summary" name="completed_summary" rows={2} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="in_progress_summary">What is currently in progress?</Label><Textarea id="in_progress_summary" name="in_progress_summary" rows={2} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="next_steps">What comes next?</Label><Textarea id="next_steps" name="next_steps" rows={2} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="blockers">What is blocked?</Label><Textarea id="blockers" name="blockers" rows={2} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Confidence</Label>
                <Select name="confidence" defaultValue="medium">
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="needs_management_support" />
                Needs management support
              </label>
              <Button type="submit" size="sm" disabled={pending} className="ml-auto">
                {pending ? "Submitting…" : "Submit Check-in"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {updates.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No check-ins submitted yet.</p>}

      <div className="flex flex-col gap-3">
        {updates.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex flex-col gap-2 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{u.author?.full_name}</span>
                <div className="flex items-center gap-2">
                  {u.needs_management_support && <Badge variant="destructive">Needs support</Badge>}
                  <Badge className={CONFIDENCE_STYLES[u.confidence]}>{u.confidence} confidence</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {u.completed_summary && <p><span className="text-muted-foreground">Completed: </span>{u.completed_summary}</p>}
              {u.in_progress_summary && <p><span className="text-muted-foreground">In progress: </span>{u.in_progress_summary}</p>}
              {u.next_steps && <p><span className="text-muted-foreground">Next: </span>{u.next_steps}</p>}
              {u.blockers && <p><span className="text-muted-foreground">Blocked: </span>{u.blockers}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
