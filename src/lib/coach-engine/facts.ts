/** Extract only facts that appear in coach context text — never invent values. */

export type CoachUserFacts = {
  weightKg: number | null;
  targetWeightKg: number | null;
  heightCm: number | null;
  age: number | null;
  calorieTarget: number | null;
  caloriesConsumed: number | null;
  caloriesRemaining: number | null;
  proteinTarget: number | null;
  proteinConsumed: number | null;
  proteinRemaining: number | null;
  carbsTarget: number | null;
  fatTarget: number | null;
  trainingGoal: string | null;
  nutritionGoal: string | null;
  experience: string | null;
  workoutDays: number | null;
  sleepHours: number | null;
  weightTrend: string | null;
  trainingToday: string | null;
  primaryPriority: string | null;
  rawSections: string[];
};

function numAfter(re: RegExp, text: string): number | null {
  const m = text.match(re);
  if (!m?.[1]) return null;
  const n = Number(String(m[1]).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function strAfter(re: RegExp, text: string): string | null {
  const m = text.match(re);
  return m?.[1]?.trim() || null;
}

export function parseCoachUserFacts(contextText: string): CoachUserFacts {
  const t = contextText;
  return {
    weightKg: numAfter(
      /(?:Gewicht|weightKg|Körpergewicht)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*kg/i,
      t
    ),
    targetWeightKg: numAfter(
      /(?:Zielgewicht|targetWeight)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*kg/i,
      t
    ),
    heightCm: numAfter(/(?:Größe|height)[^\d]{0,12}(\d{2,3})\s*cm/i, t),
    age: numAfter(/(?:Alter|age)[^\d]{0,8}(\d{1,2})\b/i, t),
    calorieTarget: numAfter(
      /(?:Kalorienziel|calorieTarget|Zielkalorien)[^\d]{0,12}(\d{3,5})/i,
      t
    ),
    caloriesConsumed: numAfter(
      /(?:konsumiert|consumed|Aufnahme)[^\d]{0,20}(\d{3,5})\s*kcal/i,
      t
    ),
    caloriesRemaining:
      numAfter(/(?:Kalorien übrig|caloriesRemaining|offen)[^\d]{0,12}(\d{2,5})/i, t) ??
      numAfter(/Protein übrig:.*?Kalorien übrig:\s*(\d+)/i, t),
    proteinTarget: numAfter(
      /(?:Proteinziel|proteinTarget|Protein[^\n]{0,20}Ziel)[^\d]{0,12}(\d{2,3})\s*g/i,
      t
    ),
    proteinConsumed: numAfter(
      /Protein:\s*(\d+(?:[.,]\d+)?)\s*\/\s*\d+/i,
      t
    ),
    proteinRemaining:
      numAfter(
        /Protein übrig[:\s]+(\d+(?:[.,]\d+)?)\s*g/i,
        t
      ) ??
      numAfter(
        /(?:proteinRemaining|offen:\s*)(\d+(?:[.,]\d+)?)\s*g/i,
        t
      ),
    carbsTarget: numAfter(
      /(?:Kohlenhydrat|carbsTarget)[^\d]{0,16}(\d{2,3})\s*g/i,
      t
    ),
    fatTarget: numAfter(/(?:Fettziel|fatTarget|Fett)[^\d]{0,16}(\d{2,3})\s*g/i, t),
    trainingGoal: strAfter(
      /(?:Trainingsziel|trainingGoal|Ziel Training)[:\s]+([^\n|]+)/i,
      t
    ),
    nutritionGoal: strAfter(
      /(?:Ernährungsziel|nutritionGoal)[:\s]+([^\n|]+)/i,
      t
    ),
    experience: strAfter(
      /(?:Erfahrung|experienceLevel|Level)[:\s]+([^\n|]+)/i,
      t
    ),
    workoutDays: numAfter(
      /(?:Trainingstage|workoutDays|Tage\/Woche)[^\d]{0,10}(\d)/i,
      t
    ),
    sleepHours: numAfter(/Schlaf:\s*(\d+(?:[.,]\d+)?)\s*h/i, t),
    weightTrend: strAfter(/Gewicht-Trend:\s*([^\n(]+)/i, t),
    trainingToday: strAfter(/Training(?: heute)?:\s*([^\n]+)/i, t),
    primaryPriority: strAfter(/Priorität heute:\s*([^\n]+)/i, t),
    rawSections: t
      .split(/\n(?=\[)/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12),
  };
}

/** Protein guideline range (g/kg) by goal keyword — evidence-based ranges. */
export function proteinRangeGPerKg(goalHint: string | null): {
  low: number;
  high: number;
  note: string;
} {
  const g = (goalHint ?? "").toLowerCase();
  if (/abnehm|cut|defizit|fettverlust|fat.?loss/.test(g)) {
    return {
      low: 1.8,
      high: 2.4,
      note: "Im Defizit etwas höher, um Muskelmasse zu schützen.",
    };
  }
  if (/muskel|aufbau|bulk|hypertroph|masse/.test(g)) {
    return {
      low: 1.6,
      high: 2.2,
      note: "Für Muskelaufbau reicht meist 1,6–2,2 g/kg.",
    };
  }
  return {
    low: 1.6,
    high: 2.2,
    note: "Allgemeiner Richtwert für krafttrainierende Personen.",
  };
}

export function estimateProteinTarget(
  weightKg: number | null,
  goalHint: string | null
): { low: number; high: number; mid: number; note: string } | null {
  if (weightKg == null || weightKg < 30 || weightKg > 250) return null;
  const range = proteinRangeGPerKg(goalHint);
  const low = Math.round(weightKg * range.low);
  const high = Math.round(weightKg * range.high);
  return {
    low,
    high,
    mid: Math.round((low + high) / 2),
    note: range.note,
  };
}
