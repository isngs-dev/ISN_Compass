"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function FormDialog({
  triggerLabel,
  title,
  description,
  action,
  children,
  submitLabel = "Save",
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  action: (formData: FormData) => Promise<unknown>;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
        setOpen(false);
        toast.success("Saved");
        // `action` is called through this wrapper rather than bound directly as the
        // form's `action` prop, so Next.js doesn't auto-refresh the current route's
        // Server Components on completion — do it explicitly so revalidatePath() calls
        // inside the action actually show up without a manual page reload.
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {children}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
