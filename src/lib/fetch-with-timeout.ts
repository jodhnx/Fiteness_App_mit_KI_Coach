export class FetchTimeoutError extends Error {
  constructor(ms: number) {
    super(`Anfrage nach ${ms}ms abgebrochen`);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs = 5000
): Promise<T> {
  const res = await fetchWithTimeout(url, { credentials: "same-origin" }, timeoutMs);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json
        ? String((json as { error: string }).error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}
