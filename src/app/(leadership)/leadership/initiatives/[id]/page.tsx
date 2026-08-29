import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  getInitiative,
  getInitiativeMilestones,
  getInitiativeTasks,
  getInitiativeUpdates,
  getInitiativeAuditLog,
} from "@/server/services/initiatives";
import { listOrgMembers } from "@/server/services/org";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { HealthBadge, InitiativeStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { OverviewTab } from "@/components/leadership/initiative/overview-tab";
import { MilestonesTab } from "@/components/leadership/initiative/milestones-tab";
import { TasksTab } from "@/components/leadership/initiative/tasks-tab";
import { UpdatesTab } from "@/components/leadership/initiative/updates-tab";
import { ActivityTab } from "@/components/leadership/initiative/activity-tab";

export default async function InitiativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const initiative = await getInitiative(id).catch(() => null);
  if (!initiative) notFound();

  const [milestones, tasks, updates, auditLog, members] = await Promise.all([
    getInitiativeMilestones(id),
    getInitiativeTasks(id),
    getInitiativeUpdates(id),
    getInitiativeAuditLog(id),
    listOrgMembers(),
  ]);

  const owner = (initiative.members ?? []).find((m: { member_role: string }) => m.member_role === "accountable_owner");
  const sponsor = (initiative.members ?? []).find((m: { member_role: string }) => m.member_role === "executive_sponsor");
  const nextMilestone = milestones
    .filter((m) => m.status !== "completed" && m.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{initiative.code}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{initiative.name}</h1>
            {initiative.strategic_objective && <p className="text-sm text-muted-foreground">{initiative.strategic_objective}</p>}
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={initiative.priority} />
            <InitiativeStatusBadge status={initiative.status} />
            <HealthBadge health={initiative.health} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-background p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Accountable Owner" value={owner?.user?.full_name ?? "Unassigned"} />
          <Field label="Executive Sponsor" value={sponsor?.user?.full_name ?? "—"} />
          <Field label="Target Date" value={initiative.target_completion_date ?? "—"} />
          <Field label="Next Milestone" value={nextMilestone?.name ?? "—"} />
          <div>
            <div className="text-xs text-muted-foreground">Progress</div>
            <div className="mt-1.5 flex items-center gap-2">
              <Progress value={initiative.percentage_complete} className="h-2 w-20" />
              <span className="text-sm font-medium">{Math.round(initiative.percentage_complete)}%</span>
            </div>
          </div>
          <Field label="Health Score" value={`${Math.round(initiative.health_score)} / 100`} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab initiative={initiative} members={members} />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestonesTab initiativeId={id} milestones={milestones} members={members} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab initiativeId={id} tasks={tasks} milestones={milestones} members={members} />
        </TabsContent>
        <TabsContent value="updates">
          <UpdatesTab initiativeId={id} updates={updates} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab auditLog={auditLog} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}
