import { siteUrl } from "@/lib/site";

const PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

function layout(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
      <tr><td style="padding:24px;">
        <p style="margin:0 0 16px;font-size:13px;font-weight:600;letter-spacing:.02em;color:#71717a;text-transform:uppercase;">iSN Compass</p>
        <h1 style="margin:0 0 16px;font-size:20px;">${title}</h1>
        ${bodyHtml}
      </td></tr>
    </table>
  </body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;color:#71717a;font-size:13px;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;">${value}</td>
  </tr>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${label}</a>`;
}

export function taskAssignedEmail(input: {
  taskName: string;
  taskDescription: string | null;
  initiativeName: string;
  dueDate: string | null;
  priority: string;
  instructions: string | null;
  confirmationToken: string;
}) {
  const confirmUrl = `${siteUrl()}/confirm/${input.confirmationToken}`;
  const body = `
    <table role="presentation" width="100%">
      ${row("Initiative", input.initiativeName)}
      ${row("Task", input.taskName)}
      ${input.taskDescription ? row("Description", input.taskDescription) : ""}
      ${row("Due date", input.dueDate ?? "Not set")}
      ${row("Priority", PRIORITY_LABEL[input.priority] ?? input.priority)}
      ${input.instructions ? row("Admin's instructions", input.instructions) : ""}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;">Once you've completed this task, click below to confirm — no login needed.</p>
    ${button(confirmUrl, "Confirm Completion")}
  `;
  return { subject: `New task assigned: ${input.taskName}`, html: layout("You've been assigned a task", body) };
}

export function taskReminderEmail(input: {
  taskName: string;
  initiativeName: string;
  dueDate: string;
  isOverdue: boolean;
  confirmationToken: string;
}) {
  const confirmUrl = `${siteUrl()}/confirm/${input.confirmationToken}`;
  const body = `
    <table role="presentation" width="100%">
      ${row("Initiative", input.initiativeName)}
      ${row("Task", input.taskName)}
      ${row("Due date", input.dueDate)}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;">
      ${input.isOverdue ? "This task is now overdue." : "This task's due date is approaching."} If it's already done, confirm below.
    </p>
    ${button(confirmUrl, "Confirm Completion")}
  `;
  return {
    subject: `${input.isOverdue ? "Overdue" : "Reminder"}: ${input.taskName}`,
    html: layout(input.isOverdue ? "Task overdue" : "Task due soon", body),
  };
}

export function adminConfirmationNoticeEmail(input: {
  taskName: string;
  initiativeName: string;
  confirmedBy: string;
  initiativeId: string;
  taskId: string;
}) {
  const body = `
    <table role="presentation" width="100%">
      ${row("Initiative", input.initiativeName)}
      ${row("Task", input.taskName)}
      ${row("Confirmed by", input.confirmedBy)}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;">The task has been marked Completed. If that's not right, you can reopen it from the dashboard.</p>
    ${button(`${siteUrl()}/initiatives/${input.initiativeId}`, "Open Initiative")}
  `;
  return { subject: `Task completed: ${input.taskName}`, html: layout("A task was completed", body) };
}
