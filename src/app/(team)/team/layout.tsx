import { PortalShell } from "@/components/shared/portal-shell";
import { requireUser } from "@/server/auth/session";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <PortalShell portal="team" user={user}>
      {children}
    </PortalShell>
  );
}
