"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteTeamMemberAction } from "@/server/actions/team-members";

export function DeleteTeamMemberButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function handleConfirmed() {
    startTransition(async () => {
      try {
        await deleteTeamMemberAction(id);
        toast.success("Deleted");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setConfirmOpen(false);
      }
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => setConfirmOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete team member?"
        description={`Permanently delete ${name}. Their past tasks stay on record but will show as unassigned.`}
        pending={pending}
        onConfirm={handleConfirmed}
      />
    </>
  );
}
