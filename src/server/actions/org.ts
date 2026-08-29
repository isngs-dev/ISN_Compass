"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { markNotificationRead, markAllNotificationsRead } from "@/server/services/org";

export async function markNotificationReadAction(id: string) {
  await requireUser();
  await markNotificationRead(id);
  revalidatePath("/team/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/team/notifications");
}
