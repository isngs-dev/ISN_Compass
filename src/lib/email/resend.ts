import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not configured");
  const { error } = await getClient().emails.send({ from, to: input.to, subject: input.subject, html: input.html });
  if (error) throw new Error(error.message);
}
