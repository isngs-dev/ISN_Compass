import Image from "next/image";
import { NavLinks } from "@/components/shared/nav-links";
import { UserMenu } from "@/components/shared/user-menu";
import type { SessionUser } from "@/server/auth/session";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Image src="/isn-logo.png" alt="ISN" width={250} height={96} className="h-7 w-auto" priority />
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
