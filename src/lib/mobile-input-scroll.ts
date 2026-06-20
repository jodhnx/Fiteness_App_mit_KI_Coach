export function scrollInputIntoView(el: HTMLElement) {
  if (typeof window === "undefined") return;
  setTimeout(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 320);
}

export function formatNumField(v: unknown): string {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "";
  return String(v);
}
