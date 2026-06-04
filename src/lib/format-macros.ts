export function fmtG(n: number, decimals = 1): string {
  const r = Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return Number.isInteger(r) ? String(r) : r.toFixed(decimals);
}

export function fmtKcal(n: number): string {
  return String(Math.round(n));
}
