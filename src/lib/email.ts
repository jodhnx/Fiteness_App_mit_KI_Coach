import { Resend } from "resend";
import nodemailer from "nodemailer";

function buildVerificationHtml(name: string, code: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #fafafa; border-radius: 12px;">
      <h1 style="color: #22d3ee; margin-bottom: 8px;">NEXFORM</h1>
      <p>Hallo ${name},</p>
      <p>dein Bestätigungscode lautet:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22d3ee; text-align: center; margin: 24px 0;">${code}</p>
      <p style="color: #a1a1aa; font-size: 14px;">Der Code ist 15 Minuten gültig. Gib ihn auf der Seite zur E-Mail-Bestätigung ein.</p>
    </div>
  `;
}

export function isEmailConfigured(): boolean {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  return Boolean(resendKey || smtpHost);
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string
): Promise<void> {
  const subject = "Dein Bestätigungscode – NEXFORM";
  const html = buildVerificationHtml(name, code);
  const from =
    process.env.EMAIL_FROM?.trim() ??
    "NEXFORM <onboarding@resend.dev>";

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }
    return;
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  if (smtpHost) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({ from, to, subject, html });
    return;
  }

  throw new Error(
    "E-Mail-Versand nicht konfiguriert. Setze RESEND_API_KEY oder SMTP_HOST in der .env Datei."
  );
}
