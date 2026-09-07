import Link from "next/link";
import { listDepartments } from "@/server/services/departments";
import { createDepartmentAction } from "@/server/actions/departments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/shared/form-dialog";

export default async function DepartmentsPage() {
  const departments = await listDepartments();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">Departments and verticals across the organization.</p>
        </div>
        <FormDialog triggerLabel="New Department" title="Create Department" action={createDepartmentAction}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
        </FormDialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            No departments yet. Create one to start organizing initiatives and team members.
          </p>
        )}
        {departments.map((d) => (
          <Link key={d.id} href={`/departments/${d.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{d.name}</CardTitle>
                {!d.is_active && <Badge variant="outline">Inactive</Badge>}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="line-clamp-2">{d.description ?? "No description"}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
