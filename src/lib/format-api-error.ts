import { Prisma } from "@prisma/client";
import { isDatabaseConnectionError } from "@/lib/prisma-errors";
import { validateSupabaseDatabaseEnv, explainSupabasePoolerError, flattenErrorMessage } from "@/lib/database-url";

/** Detect misconfigured Supabase URL (project ref used as hostname). */
export function formatConnectionErrorMessage(error: unknown): string | null {
  const msg = flattenErrorMessage(error);

  const poolerHint = explainSupabasePoolerError(msg);
  if (poolerHint) return poolerHint;

  if (/ENOTFOUND\s+postgres\.[a-z0-9]+/i.test(msg)) {
    return (
      'DATABASE_URL ist falsch konfiguriert: „postgres.PROJECT_REF" wurde als Hostname verwendet. ' +
      "Der Host muss z. B. aws-1-eu-west-2.pooler.supabase.com sein — der User ist postgres.PROJECT_REF."
    );
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
    const env = validateSupabaseDatabaseEnv();
    if (!env.ok) return env.issues.join(" ");
  }
  return null;
}

/** Human-readable API error — never expose migration commands to end users. */
export function formatApiErrorMessage(error: unknown): string {
  const connectionDetail = formatConnectionErrorMessage(error);
  if (connectionDetail) {
    // Strip developer-only env dumps for client responses when possible
    console.error("[api] connection", connectionDetail);
    return "Verbindung zur Datenbank fehlgeschlagen. Bitte später erneut versuchen.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2021":
      case "P2022":
        console.error("[api] schema mismatch", error.code, error.meta);
        return "Einige Daten sind vorübergehend nicht verfügbar. Bitte später erneut versuchen.";
      case "P2002":
        return "Dieser Eintrag existiert bereits.";
      case "P2003":
        return "Verknüpfter Datensatz existiert nicht.";
      case "P2025":
        return "Datensatz nicht gefunden.";
      default:
        console.error("[api] prisma", error.code, error.message);
        return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
    }
  }

  if (isDatabaseConnectionError(error)) {
    console.error("[api] db connection", error);
    return "Datenbank vorübergehend nicht erreichbar. Bitte später erneut versuchen.";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[api] prisma init", error.message);
    return "Datenbankverbindung fehlgeschlagen. Bitte später erneut versuchen.";
  }

  if (error instanceof Error) {
    // Never forward raw prisma / stack messages to clients
    if (/prisma|db push|migrate|P20\d{2}|relation .* does not exist/i.test(error.message)) {
      console.error("[api] suppressed technical error", error.message);
      return "Daten vorübergehend nicht verfügbar. Bitte erneut versuchen.";
    }
    return error.message;
  }
  return "Interner Serverfehler";
}

export function apiErrorStatus(error: unknown): number {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022") return 503;
    if (error.code === "P2002") return 409;
  }
  if (isDatabaseConnectionError(error)) return 503;
  return 500;
}
