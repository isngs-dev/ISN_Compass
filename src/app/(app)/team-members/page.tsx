import Link from "next/link";
import { listTeamMembers } from "@/server/services/team-members";
import { listDepartments } from "@/server/services/departments";
import { createTeamMemberAction, deactivateTeamMemberAction, reactivateTeamMemberAction } from "@/server/actions/team-members";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteTeamMemberButton } from "@/components/shared/delete-team-member-button";

export default async function TeamMembersPage() {
  const [members, departments] = await Promise.all([listTeamMembers(), listDepartments()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Members</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} — directory only, no login access.
          </p>
        </div>
        <FormDialog triggerLabel="New Team Member" title="Add Team Member" action={createTeamMemberAction}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Department</Label>
            <Select name="department_id" items={departments.map((d) => ({ value: d.id, label: d.name }))}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </FormDialog>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {members.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No team members yet.</p>}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-md px-3 py-2.5 hover:bg-muted">
              <Link href={`/team-members/${m.id}`} className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.email} · {(m.department as { name?: string } | null)?.name ?? "No department"}
                </div>
              </Link>
              {!m.is_active && <Badge variant="outline">Inactive</Badge>}
              <form action={m.is_active ? deactivateTeamMemberAction.bind(null, m.id) : reactivateTeamMemberAction.bind(null, m.id)}>
                <Button type="submit" size="sm" variant="outline">{m.is_active ? "Deactivate" : "Reactivate"}</Button>
              </form>
              {!m.is_active && <DeleteTeamMemberButton id={m.id} name={m.name} />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
