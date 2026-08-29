import { PortalShell } from "@/components/shared/portal-shell";
import { requireUser, isLeadership } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function LeadershipLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isLeadership(user)) redirect("/team/my-work");

  return (
    <PortalShell portal="leadership" user={user}>
      {children}
    </PortalShell>
  );
}
