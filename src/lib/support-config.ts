import type { SupportCategory } from "@prisma/client";

export const SUPPORT_CATEGORIES: {
  value: SupportCategory;
  label: string;
}[] = [
  { value: "PROBLEM", label: "Problem melden" },
  { value: "IMPROVEMENT", label: "Verbesserungsvorschlag" },
  { value: "FEATURE", label: "Feature-Wunsch" },
  { value: "BUG", label: "Fehler melden" },
  { value: "ACCOUNT", label: "Account Problem" },
  { value: "OTHER", label: "Sonstiges" },
];

export const SUPPORT_QUICK_TOPICS: {
  title: string;
  description: string;
  category: SupportCategory;
}[] = [
  {
    title: "Kontakt aufnehmen",
    description: "Allgemeine Fragen an unser Team",
    category: "OTHER",
  },
  {
    title: "Verbesserungsvorschlag senden",
    description: "Ideen zur App-Optimierung",
    category: "IMPROVEMENT",
  },
  {
    title: "Problem melden",
    description: "Etwas funktioniert nicht wie erwartet",
    category: "PROBLEM",
  },
  {
    title: "Feature-Wunsch senden",
    description: "Neue Funktionen vorschlagen",
    category: "FEATURE",
  },
  {
    title: "Sonstiges",
    description: "Alles andere — wir helfen gerne",
    category: "OTHER",
  },
];

export function supportCategoryLabel(category: SupportCategory): string {
  return SUPPORT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  RESOLVED: "Erledigt",
};

export function getAppName() {
  return process.env.APP_NAME?.trim() || "NEXFORM";
}

export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || "";
}

export const SUPPORT_EMAIL_STATUS_LABELS: Record<string, string> = {
  SAVED: "Gespeichert",
  EMAIL_SENT: "Email versendet",
  EMAIL_FAILED: "Email fehlgeschlagen",
};

export function supportEmailStatusLabel(status: string): string {
  return SUPPORT_EMAIL_STATUS_LABELS[status] ?? status;
}

export function getSupportEnvIssues(): string[] {
  const issues: string[] = [];
  if (!getSupportEmail()) {
    issues.push("SUPPORT_EMAIL fehlt");
  }
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(process.env.SMTP_HOST?.trim());
  if (!hasResend && !hasSmtp) {
    issues.push("RESEND_API_KEY oder SMTP_HOST fehlt");
  }
  return issues;
}

export function getSupportEnvIssueMessage(): string | null {
  const issues = getSupportEnvIssues();
  if (issues.length === 0) return null;
  return `E-Mail-Konfiguration unvollständig: ${issues.join(", ")}.`;
}

export function getSupportEnvStatus() {
  return {
    supportEmail: Boolean(getSupportEmail()),
    resendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    smtpHost: Boolean(process.env.SMTP_HOST?.trim()),
    emailFrom: Boolean(process.env.EMAIL_FROM?.trim()),
    appName: getAppName(),
    ready: getSupportEnvIssues().length === 0,
  };
}
