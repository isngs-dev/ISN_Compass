import { Compass } from "lucide-react";
import { NavLinks } from "@/components/shared/nav-links";
import { UserMenu } from "@/components/shared/user-menu";
import type { SessionUser } from "@/server/auth/session";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold leading-none">iSN Compass</div>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <NavLinks />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b bg-background px-4">
          <UserMenu email={user.email} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
