/** Intentionally no-op — scrolling on focus caused layout jumps on mobile keyboards. */
export function scrollInputIntoView(_el: HTMLElement) {
  void _el;
}

export function formatNumField(v: unknown): string {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(v);
}
