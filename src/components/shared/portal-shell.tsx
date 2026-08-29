import Link from "next/link";
import { Compass, ArrowLeftRight, Search } from "lucide-react";
import { NavLinks } from "@/components/shared/nav-links";
import { UserMenu } from "@/components/shared/user-menu";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/server/auth/session";
import { isLeadership, orgLevelLabel } from "@/server/auth/session";

export function PortalShell({
  portal,
  user,
  children,
}: {
  portal: "leadership" | "team";
  user: SessionUser;
  children: React.ReactNode;
}) {
  const canSeeOtherPortal = portal === "team" ? isLeadership(user) : true;
  const otherPortalHref = portal === "leadership" ? "/team/my-work" : "/leadership/command-center";
  const otherPortalLabel = portal === "leadership" ? "Team" : "Leadership";

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </div>
          <div className="leading-none">
            <div className="text-sm font-semibold">iSN Compass</div>
            <div className="text-[11px] text-muted-foreground">{portal === "leadership" ? "Leadership" : "Team"}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <NavLinks portal={portal} />
        </div>
        {canSeeOtherPortal && (
          <div className="border-t p-3">
            <Button render={<Link href={otherPortalHref} />} nativeButton={false} variant="outline" size="sm" className="w-full justify-start gap-2">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Switch to {otherPortalLabel}
            </Button>
          </div>
        )}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
          <Link href={`/${portal}/search`} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            <Search className="h-3.5 w-3.5" />
            Search Compass…
          </Link>
          <UserMenu name={user.profile.full_name} roleLabel={orgLevelLabel(user.profile.org_level)} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
