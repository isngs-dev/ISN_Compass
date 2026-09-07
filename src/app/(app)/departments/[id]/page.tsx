import { notFound } from "next/navigation";
import { getDepartment, getDepartmentTeamMembers } from "@/server/services/departments";
import { updateDepartmentAction } from "@/server/actions/departments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const department = await getDepartment(id).catch(() => null);
  if (!department) notFound();

  const teamMembers = await getDepartmentTeamMembers(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{department.name}</h1>
        <p className="text-sm text-muted-foreground">{department.description ?? "No description provided."}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Team Members ({teamMembers.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {teamMembers.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No team members in this department yet.</p>
            )}
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md px-2 py-2.5">
                <div>
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
                {!m.is_active && <span className="text-xs text-muted-foreground">Inactive</span>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Department</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateDepartmentAction.bind(null, id)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={department.name} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} defaultValue={department.description ?? ""} />
              </div>
              <Button type="submit" size="sm">Save</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
