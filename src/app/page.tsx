import { redirect } from "next/navigation";
import { getCurrentUser, defaultPortalPath } from "@/server/auth/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(defaultPortalPath(user));
}
