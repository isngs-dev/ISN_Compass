import { requireUser } from "@/server/auth/session";
import { listApprovalsForUser } from "@/server/services/governance";
import { ApprovalsList } from "@/components/team/approvals-list";

export default async function ApprovalsPage() {
  const user = await requireUser();
  const approvals = await listApprovalsForUser(user.id);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">Requests waiting on your decision</p>
      </div>
      <ApprovalsList approvals={approvals} />
    </div>
  );
}
