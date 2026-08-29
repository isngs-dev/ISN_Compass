"use client";

import { Button } from "@/components/ui/button";

const DEMO_PASSWORD = "Compass!Demo2026";

const DEMO_ACCOUNTS = [
  { label: "Leadership demo", email: "sarah.chen@isngroup.demo" },
  { label: "Team demo", email: "maria.santos@isngroup.demo" },
];

export function DemoLoginButtons() {
  function fillAndSubmit(email: string) {
    const form = document.querySelector<HTMLFormElement>("form[data-login-form]");
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;
    if (!form || !emailInput || !passwordInput) return;
    emailInput.value = email;
    passwordInput.value = DEMO_PASSWORD;
    form.requestSubmit();
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t pt-4">
      <p className="text-center text-xs text-muted-foreground">Quick demo login</p>
      <div className="flex gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fillAndSubmit(account.email)}
          >
            {account.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
