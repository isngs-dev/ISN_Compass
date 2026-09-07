import { notFound } from "next/navigation";
import { getInitiative, getInitiativeTasks, getInitiativeActivity } from "@/server/services/initiatives";
import { listDepartments } from "@/server/services/departments";
import { listTeamMembers } from "@/server/services/team-members";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InitiativeStatusBadge } from "@/components/shared/badges";
import { OverviewTab } from "@/components/initiative/overview-tab";
import { TasksTab } from "@/components/initiative/tasks-tab";
import { ActivityTab } from "@/components/initiative/activity-tab";

export default async function InitiativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initiative = await getInitiative(id).catch(() => null);
  if (!initiative) notFound();

  const [tasks, activity, departments, members] = await Promise.all([
    getInitiativeTasks(id),
    getInitiativeActivity(id),
    listDepartments(),
    listTeamMembers(),
  ]);

  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const awaitingConfirmation = tasks.filter((t) => t.status === "completion_confirmed").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "completed").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{(initiative.department as { name?: string } | null)?.name}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{initiative.name}</h1>
          </div>
          <InitiativeStatusBadge status={initiative.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-background p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Total Tasks" value={String(tasks.length)} />
          <Field label="Completed" value={String(completed)} />
          <Field label="In Progress" value={String(inProgress)} />
          <Field label="Awaiting Confirmation" value={String(awaitingConfirmation)} />
          <Field label="Overdue" value={String(overdue)} />
          <Field label="Target Date" value={initiative.target_date ?? "—"} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab initiative={initiative} departments={departments} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab initiativeId={id} tasks={tasks} members={members} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab entries={activity} />
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
