import { NextResponse } from "next/server";
import { apiErrorStatus, formatApiErrorMessage } from "@/lib/format-api-error";

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
  console.error("[api]", error);
  const message = formatApiErrorMessage(error);
  const status = apiErrorStatus(error);
  return jsonError(message, status);
}
