import { listMembersWithRoles, listRoles } from "@/server/services/admin";
import { assignRoleAction } from "@/server/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/shared/form-dialog";

export default async function AdminPage() {
  const [members, roles] = await Promise.all([listMembersWithRoles(), listRoles()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
          <p className="text-sm text-muted-foreground">{members.length} org members · {roles.length} roles</p>
        </div>
        <FormDialog triggerLabel="Assign Role" title="Assign Role" submitLabel="Assign" action={assignRoleAction}>
          <div className="flex flex-col gap-1.5">
            <Label>Member</Label>
            <Select name="user_id" required>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select name="role_id" required>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </FormDialog>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1 p-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{m.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.email} · {m.title ?? m.org_level} · Manager: {m.manager?.full_name ?? "—"}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {(m.roles ?? []).map((r, idx) => {
                  const role = r.role;
                  return role ? <Badge key={role.id ?? idx} variant="secondary">{role.name}</Badge> : null;
                })}
                {!m.is_active && <Badge variant="destructive">Inactive</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
