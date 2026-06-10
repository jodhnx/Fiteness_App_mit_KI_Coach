import { Prisma } from "@prisma/client";
import { isDatabaseConnectionError } from "@/lib/prisma-errors";

/** Human-readable API error — no false "migrate deploy" hints. */
export function formatApiErrorMessage(error: unknown): string {
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
    return "Datenbank nicht erreichbar. Prüfe DATABASE_URL in der .env.";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
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
