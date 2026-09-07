import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTasksNeedingReminder, markReminderSent } from "@/server/services/tasks";
import { sendEmail } from "@/lib/email/resend";
import { taskReminderEmail } from "@/lib/email/templates";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const tasks = await listTasksNeedingReminder(supabase);
  const today = new Date().toISOString().slice(0, 10);

  let sent = 0;
  let failed = 0;
  for (const task of tasks) {
    if (!task.assignee || !task.due_date) continue;
    const email = taskReminderEmail({
      taskName: task.name,
      initiativeName: task.initiative?.name ?? "—",
      dueDate: task.due_date,
      isOverdue: task.due_date < today,
      confirmationToken: task.confirmation_token,
    });
    // One bad address or transient Resend error shouldn't stop reminders for
    // everyone else in the batch.
    try {
      await sendEmail({ to: task.assignee.email, subject: email.subject, html: email.html });
      await markReminderSent(supabase, task.id);
      sent += 1;
    } catch (err) {
      console.error("Failed to send reminder for task", task.id, err);
      failed += 1;
    }
  }

  return NextResponse.json({ checked: tasks.length, sent, failed });
}
