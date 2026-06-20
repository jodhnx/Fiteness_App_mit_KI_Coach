export type ChartRange = "day" | "week" | "month";

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
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function monthKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  const map = new Map<string, { sum: number; count: number; label: string }>();
  for (const p of points) {
    const key = range === "week" ? weekKey(p.date) : monthKey(p.date);
    const prev = map.get(key) ?? { sum: 0, count: 0, label: key };
    prev.sum += field === "calories" ? p.calories : p.proteinG;
    prev.count += 1;
    map.set(key, prev);
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(range === "week" ? -12 : -6)
    .map(([, v]) => ({
      label: v.label.replace(/^\d+-W/, "W").replace(/^\d+-/, ""),
      value: Math.round(v.sum / Math.max(1, v.count)),
    }));
}

export function aggregateSumByRange(
  points: { date: string; label: string; value: number }[],
  range: ChartRange
): ChartPoint[] {
  if (range === "day") {
    return points.slice(-14).map((p) => ({ label: p.label, value: p.value }));
  }

  const map = new Map<string, number>();
  for (const p of points) {
    const key = range === "week" ? weekKey(p.date) : monthKey(p.date);
    map.set(key, (map.get(key) ?? 0) + p.value);
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(range === "week" ? -12 : -6)
    .map(([k, v]) => ({
      label: k.replace(/^\d+-W/, "W").replace(/^\d+-/, ""),
      value: Math.round(v),
    }));
}
