"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeMyTaskAction } from "@/server/actions/my-tasks";

export function CompleteTaskButton({ taskId, taskName }: { taskId: string; taskName: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(`Mark "${taskName}" as completed? The Admin will be notified.`)) return;
    startTransition(async () => {
      try {
        await completeMyTaskAction(taskId);
        toast.success("Marked as completed");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Button size="sm" disabled={pending} onClick={handleClick}>
      {pending ? "Saving…" : "Mark as Completed"}
    </Button>
  );
}
