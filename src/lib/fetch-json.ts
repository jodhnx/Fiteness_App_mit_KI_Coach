/** Client fetch with timeout — verhindert endloses „Speichern…“ */
export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<{ res: Response; data: T }> {
  const { timeoutMs = 25_000, ...fetchInit } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
      credentials: "include",
    });
    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      throw new Error(
        res.ok
          ? "Ungültige Server-Antwort (kein JSON)"
          : `Server-Fehler (${res.status})`
      );
    }
    return { res, data };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        "Zeitüberschreitung — Server antwortet nicht. Bitte Verbindung prüfen."
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
