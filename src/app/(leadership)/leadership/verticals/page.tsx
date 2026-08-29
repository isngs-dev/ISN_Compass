import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listVerticals } from "@/server/services/verticals";
import { listOrgMembers } from "@/server/services/org";
import { createVerticalAction } from "@/server/actions/verticals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";

export default async function VerticalsPage() {
  await requireUser();
  const [verticals, members] = await Promise.all([listVerticals(), listOrgMembers()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Verticals</h1>
          <p className="text-sm text-muted-foreground">Organizational lines of business and their leadership.</p>
        </div>
        <FormDialog triggerLabel="New Vertical" title="Create Business Vertical" action={createVerticalAction}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Vertical Head</Label>
            <Select name="vertical_head_id">
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormDialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {verticals.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            No business verticals yet. Create one to start organizing initiatives.
          </p>
        )}
        {verticals.map((v) => (
          <Link key={v.id} href={`/leadership/verticals/${v.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">{v.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p className="line-clamp-2">{v.description ?? "No description"}</p>
                <p>Head: {(v.vertical_head as { full_name?: string } | null)?.full_name ?? "Unassigned"}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
