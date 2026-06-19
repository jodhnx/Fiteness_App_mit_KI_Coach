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

/** Human-readable API error — no false "migrate deploy" hints. */
export function formatApiErrorMessage(error: unknown): string {
  const connectionDetail = formatConnectionErrorMessage(error);
  if (connectionDetail) return connectionDetail;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const model = error.meta?.modelName ? String(error.meta.modelName) : "";
    const table = error.meta?.table ? String(error.meta.table) : model;

    switch (error.code) {
      case "P2021":
        return table
          ? `Datenbanktabelle „${table}" fehlt. Schema synchronisieren: npx prisma db push`
          : "Eine benötigte Datenbanktabelle fehlt. Schema synchronisieren: npx prisma db push";
      case "P2022": {
        const column = error.meta?.column ? String(error.meta.column) : "";
        return column
          ? `Datenbankspalte „${column}" fehlt${model ? ` (${model})` : ""}. npx prisma db push`
          : "Eine benötigte Datenbankspalte fehlt. npx prisma db push";
      }
      case "P2002":
        return "Dieser Eintrag existiert bereits.";
      case "P2003":
        return "Verknüpfter Datensatz existiert nicht.";
      case "P2025":
        return "Datensatz nicht gefunden.";
      default:
        return error.message;
    }
  }

  if (isDatabaseConnectionError(error)) {
    const env = validateSupabaseDatabaseEnv();
    if (!env.ok) return env.issues.join(" ");
    return "Datenbank nicht erreichbar. Prüfe DATABASE_URL in der .env.";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    const env = validateSupabaseDatabaseEnv();
    if (!env.ok) return env.issues.join(" ");
    return "Datenbankverbindung fehlgeschlagen. Prüfe DATABASE_URL.";
  }

  if (error instanceof Error) return error.message;
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
