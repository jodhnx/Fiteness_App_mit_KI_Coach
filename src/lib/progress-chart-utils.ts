export type ChartRange = "day" | "week" | "month" | "year" | "all";

export type NutritionPoint = {
  date: string;
  label: string;
  calories: number;
  proteinG: number;
};

export type ChartPoint = { label: string; value: number };

function weekKey(isoDate: string): string {
  const d = new Date(isoDate);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${week}`;
}

function monthKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yearKey(isoDate: string): string {
  return String(new Date(isoDate).getFullYear());
}

function formatBucketLabel(key: string, range: ChartRange): string {
  if (range === "week") return key.replace(/^\d+-W/, "W");
  if (range === "month") return key.replace(/^\d+-/, "");
  return key;
}

export function aggregateNutrition(
  points: NutritionPoint[],
  range: ChartRange,
  field: "calories" | "proteinG"
): ChartPoint[] {
  if (points.length === 0) return [];

  if (range === "day") {
    return points.slice(-14).map((p) => ({
      label: p.label,
      value: field === "calories" ? p.calories : p.proteinG,
    }));
  }

  const keyFn =
    range === "week" ? weekKey : range === "year" ? yearKey : monthKey;

  const map = new Map<string, { sum: number; count: number; label: string }>();
  for (const p of points) {
    const key = keyFn(p.date);
    const prev = map.get(key) ?? { sum: 0, count: 0, label: key };
    prev.sum += field === "calories" ? p.calories : p.proteinG;
    prev.count += 1;
    map.set(key, prev);
  }

  const slice =
    range === "week" ? -12 : range === "month" ? -12 : range === "year" ? -8 : undefined;

  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const sliced = slice != null ? entries.slice(slice) : entries;

  return sliced.map(([, v]) => ({
    label: formatBucketLabel(v.label, range === "all" ? "month" : range),
    value: Math.round(v.sum / Math.max(1, v.count)),
  }));
}

export function aggregateSumByRange(
  points: { date: string; label: string; value: number }[],
  range: ChartRange
): ChartPoint[] {
  if (points.length === 0) return [];

  if (range === "day") {
    return points.slice(-14).map((p) => ({ label: p.label, value: p.value }));
  }

  const keyFn =
    range === "week" ? weekKey : range === "year" ? yearKey : monthKey;

  const map = new Map<string, number>();
  for (const p of points) {
    const key = keyFn(p.date);
    map.set(key, (map.get(key) ?? 0) + p.value);
  }

  const slice =
    range === "week" ? -12 : range === "month" ? -12 : range === "year" ? -8 : undefined;

  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const sliced = slice != null ? entries.slice(slice) : entries;

  return sliced.map(([k, v]) => ({
    label: formatBucketLabel(k, range === "all" ? "month" : range),
    value: Math.round(v),
  }));
}
