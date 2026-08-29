import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getTask } from "@/server/services/tasks";
import { listOrgMembers } from "@/server/services/org";
import { TaskDetail } from "@/components/team/task-detail";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const task = await getTask(id).catch(() => null);
  if (!task) notFound();

  const members = await listOrgMembers();

  return <TaskDetail task={task} members={members} />;
}
