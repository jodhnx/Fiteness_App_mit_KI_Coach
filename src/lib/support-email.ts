import { Resend } from "resend";
import nodemailer from "nodemailer";
import { getAppName, getSupportEmail, supportCategoryLabel } from "@/lib/support-config";
import type { SupportCategory } from "@prisma/client";

function emailFrom() {
  return process.env.EMAIL_FROM?.trim() ?? "NEXFORM <onboarding@resend.dev>";
}

async function dispatchEmail(to: string, subject: string, html: string) {
  const from = emailFrom();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("Resend Fehler:", error);
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
    "E-Mail-Versand nicht konfiguriert. Setze RESEND_API_KEY oder SMTP_HOST."
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSupportTeamHtml(input: {
  name: string;
  email: string;
  category: SupportCategory;
  message: string;
  userId?: string | null;
  createdAt: Date;
}) {
  const category = supportCategoryLabel(input.category);
  const date = input.createdAt.toLocaleString("de-DE", { timeZone: "Europe/Vienna" });
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #fafafa; color: #18181b; border-radius: 12px;">
      <h2 style="margin: 0 0 16px; color: #0891b2;">Neue Support-Anfrage</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #71717a; width: 120px;">Name</td><td><strong>${escapeHtml(input.name)}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #71717a;">E-Mail</td><td>${escapeHtml(input.email)}</td></tr>
        <tr><td style="padding: 8px 0; color: #71717a;">Kategorie</td><td>${escapeHtml(category)}</td></tr>
        <tr><td style="padding: 8px 0; color: #71717a;">Datum</td><td>${escapeHtml(date)}</td></tr>
        <tr><td style="padding: 8px 0; color: #71717a;">User-ID</td><td>${escapeHtml(input.userId ?? "—")}</td></tr>
      </table>
      <div style="margin-top: 20px; padding: 16px; background: #fff; border: 1px solid #e4e4e7; border-radius: 8px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #71717a; text-transform: uppercase;">Nachricht</p>
        <p style="margin: 0; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(input.message)}</p>
      </div>
    </div>
  `;
}

function buildConfirmationHtml(name: string, category: SupportCategory) {
  const appName = getAppName();
  const categoryLabel = supportCategoryLabel(category);
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #fafafa; border-radius: 12px;">
      <h1 style="color: #22d3ee; margin-bottom: 16px;">${escapeHtml(appName)}</h1>
      <p>Hallo ${escapeHtml(name)},</p>
      <p>vielen Dank für deine Nachricht.</p>
      <p>Wir haben deine Anfrage erfolgreich erhalten und werden sie prüfen.</p>
      <p><strong>Kategorie:</strong><br/>${escapeHtml(categoryLabel)}</p>
      <p style="color: #a1a1aa;">Unser Team wird dir in der Regel innerhalb von 24 Stunden antworten.</p>
      <p>Vielen Dank für dein Feedback und deine Unterstützung.</p>
      <p style="margin-top: 24px;">Mit freundlichen Grüßen<br/><strong>${escapeHtml(appName)} Support Team</strong></p>
    </div>
  `;
}

export async function sendSupportEmails(input: {
  name: string;
  email: string;
  category: SupportCategory;
  message: string;
  userId?: string | null;
  createdAt: Date;
}) {
  const supportTo = getSupportEmail();
  if (!supportTo) {
    throw new Error("SUPPORT_EMAIL ist nicht konfiguriert.");
  }

  await dispatchEmail(
    supportTo,
    "[Fitness App Support] Neue Anfrage",
    buildSupportTeamHtml(input)
  );
  console.log("Email an Support versendet");

  await dispatchEmail(
    input.email,
    "Wir haben deine Anfrage erhalten",
    buildConfirmationHtml(input.name, input.category)
  );
  console.log("Bestätigungsmail versendet");
}

export function isSupportEmailConfigured() {
  return Boolean(getSupportEmail()) && Boolean(
    process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim()
  );
}
