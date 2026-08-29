import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getMeeting, buildSinceLastMeetingReport, listMeetings } from "@/server/services/meetings";
import { completeMeetingAction } from "@/server/actions/meetings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const meeting = await getMeeting(id).catch(() => null);
  if (!meeting) notFound();

  const allMeetings = await listMeetings(user.profile.organization_id);
  const previous = allMeetings.find((m) => m.status === "completed" && m.meeting_date < meeting.meeting_date);
  const report = await buildSinceLastMeetingReport(user.profile.organization_id, previous?.meeting_date ?? null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">{meeting.meeting_date}</p>
        </div>
        <Badge variant={meeting.status === "completed" ? "secondary" : "default"} className="capitalize">{meeting.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ReportSection title={`Completed Tasks (${report.completedTasks.length})`} empty="No tasks completed since last meeting.">
          {report.completedTasks.map((t) => (
            <Row key={t.id} label={t.title} sub={(t.initiative as { name?: string } | null)?.name} />
          ))}
        </ReportSection>
        <ReportSection title={`Overdue Tasks (${report.overdueTasks.length})`} empty="No overdue tasks.">
          {report.overdueTasks.map((t) => (
            <Row key={t.id} label={t.title} sub={`Due ${t.due_date}`} />
          ))}
        </ReportSection>
        <ReportSection title={`New Blockers (${report.newBlockers.length})`} empty="No new blockers.">
          {report.newBlockers.map((t) => (
            <Row key={t.id} label={t.title} sub={(t.initiative as { name?: string } | null)?.name} />
          ))}
        </ReportSection>
        <ReportSection title={`New Risks (${report.newRisks.length})`} empty="No new risks.">
          {report.newRisks.map((r) => (
            <Row key={r.id} label={r.description} sub={r.status} />
          ))}
        </ReportSection>
        <ReportSection title={`New Decisions (${report.newDecisions.length})`} empty="No new decisions.">
          {report.newDecisions.map((d) => (
            <Row key={d.id} label={d.title} sub={d.status} />
          ))}
        </ReportSection>
        <ReportSection title={`Completed Milestones (${report.completedMilestones.length})`} empty="No milestones completed.">
          {report.completedMilestones.map((m) => (
            <Row key={m.id} label={m.name} sub={(m.initiative as { name?: string } | null)?.name} />
          ))}
        </ReportSection>
      </div>

      {report.newInitiatives.length > 0 && (
        <ReportSection title={`New Initiatives (${report.newInitiatives.length})`} empty="">
          {report.newInitiatives.map((i) => (
            <Row key={i.id} label={i.name} sub={i.code} />
          ))}
        </ReportSection>
      )}

      {meeting.status !== "completed" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Complete Meeting</CardTitle></CardHeader>
          <CardContent>
            <form action={completeMeetingAction.bind(null, meeting.id)} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="summary">Summary</Label><Textarea id="summary" name="summary" rows={2} /></div>
              <Button type="submit" size="sm" className="self-end">Complete Meeting</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {meeting.status === "completed" && meeting.summary && (
        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{meeting.summary}</CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const isEmpty = items.flat().length === 0;
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm">
        {isEmpty ? <p className="text-muted-foreground">{empty}</p> : children}
      </CardContent>
    </Card>
  );
}

function Row({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
      <span className="truncate">{label}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
