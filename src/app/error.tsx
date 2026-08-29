"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium text-muted-foreground">Something went wrong</p>
      <h1 className="text-2xl font-semibold tracking-tight">{error.message || "Unexpected error"}</h1>
      <Button className="mt-2" onClick={() => reset()}>Try again</Button>
    </div>
  );
}
