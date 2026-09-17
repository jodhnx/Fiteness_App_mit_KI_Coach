/** Shared client-side mapping for nutrition-plan API errors. */
export function nutritionPlanApiErrorMessage(
  status: number,
  body: { error?: string; code?: string } | null
): string {
  const code = body?.code;
  const serverMsg = body?.error?.trim();

  if (status === 401 || code === "UNAUTHORIZED") {
    return "Bitte erneut anmelden.";
  }
  if (status === 403 || code === "FORBIDDEN") {
    return "Keine Berechtigung für diesen Plan.";
  }
  if (status === 404 || code === "NOT_FOUND") {
    return "Plan nicht gefunden.";
  }
  if (status === 409 || code === "CONFLICT") {
    return serverMsg || "Konflikt — Eintrag existiert bereits.";
  }
  if (status === 400) {
    return serverMsg || "Ungültige Eingabe.";
  }
  if (status === 503 || code === "SCHEMA_MISMATCH" || code === "DB_UNAVAILABLE") {
    if (code === "SCHEMA_MISMATCH") {
      return (
        serverMsg ||
        "Ernährungspläne sind noch nicht vollständig eingerichtet. Bitte später erneut versuchen."
      );
    }
    return (
      serverMsg ||
      "Datenbank vorübergehend nicht erreichbar. Bitte später erneut versuchen."
    );
  }
  if (status >= 500) {
    return serverMsg || "Serverfehler. Bitte später erneut versuchen.";
  }
  return serverMsg || "Aktion fehlgeschlagen.";
}
