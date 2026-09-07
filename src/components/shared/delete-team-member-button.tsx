"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTeamMemberAction } from "@/server/actions/team-members";

export function DeleteTeamMemberButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(`Permanently delete ${name}? Their past tasks stay on record but will show as unassigned.`)) return;
    startTransition(async () => {
      try {
        await deleteTeamMemberAction(id);
        toast.success("Deleted");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={handleClick}>
      Delete
    </Button>
  );
}
