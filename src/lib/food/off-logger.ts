export function logOffRequest(
  label: string,
  url: string,
  info: {
    status?: number;
    ok?: boolean;
    durationMs?: number;
    bodyPreview?: string;
    productCount?: number;
    error?: unknown;
  }
) {
  const errMsg =
    info.error instanceof Error
      ? `${info.error.name}: ${info.error.message}`
      : info.error
        ? String(info.error)
        : undefined;

  console.log(`[open-food-facts] ${label}`, {
    url,
    status: info.status,
    ok: info.ok,
    durationMs: info.durationMs,
    productCount: info.productCount,
    bodyPreview: info.bodyPreview?.slice(0, 280),
    error: errMsg,
  });

  if (errMsg) {
    console.error(`[open-food-facts] ${label} ERROR:`, errMsg);
  }
}
