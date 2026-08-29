"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { createMeeting, completeMeeting } from "@/server/services/meetings";

export async function startMeetingAction() {
  const user = await requireUser();
  const meeting = await createMeeting({
    organization_id: user.profile.organization_id,
    title: "Weekly Strategy Review",
    meeting_date: new Date().toISOString().slice(0, 10),
    created_by: user.id,
  });
  revalidatePath("/leadership/strategy-review");
  redirect(`/leadership/strategy-review/${meeting.id}`);
}

export async function completeMeetingAction(id: string, formData: FormData) {
  await requireUser();
  await completeMeeting(id, String(formData.get("notes") ?? ""), String(formData.get("summary") ?? ""));
  revalidatePath("/leadership/strategy-review");
  revalidatePath(`/leadership/strategy-review/${id}`);
}
