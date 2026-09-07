import { redirect } from "next/navigation";
import { CheckCircle2, Compass, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTaskByConfirmationToken } from "@/server/services/tasks";
import { confirmTaskAction } from "@/server/actions/confirm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ConfirmTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;

  const supabase = createAdminClient();
  const task = await getTaskByConfirmationToken(supabase, token);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">iSN Compass</CardTitle>
        </CardHeader>
        <CardContent>
          {!task ? (
            <Result icon={<XCircle className="h-8 w-8 text-destructive" />} title="Link not found" description="This confirmation link is invalid." />
          ) : done === "1" || task.status === "completion_confirmed" || task.status === "completed" ? (
            <Result
              icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
              title="Completion confirmed"
              description={`"${task.name}" has been marked as confirmed. Thanks!`}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div>
                <CardDescription className="mb-1">{task.initiative?.name}</CardDescription>
                <p className="font-medium">{task.name}</p>
                {task.due_date && <p className="text-xs text-muted-foreground">Due {task.due_date}</p>}
              </div>
              <form
                action={async () => {
                  "use server";
                  await confirmTaskAction(token);
                  redirect(`/confirm/${token}?done=1`);
                }}
              >
                <Button type="submit">Confirm Completion</Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Result({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      {icon}
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
