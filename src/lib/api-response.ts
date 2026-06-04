import { NextResponse } from "next/server";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return jsonError("Nicht angemeldet", 401);
    if (error.message === "FORBIDDEN") return jsonError("Keine Berechtigung", 403);
  }
  if (isSchemaMismatchError(error)) {
    console.error("[api] schema mismatch", error);
    return jsonError(
      "Datenbank-Schema veraltet. Bitte ausführen: npx prisma migrate deploy",
      503
    );
  }
  console.error(error);
  return jsonError("Interner Serverfehler", 500);
}
