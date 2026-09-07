import { AppShell } from "@/components/shared/app-shell";
import { requireUser } from "@/server/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
