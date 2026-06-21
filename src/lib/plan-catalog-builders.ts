/** Per-exercise catalog entries for premium training plans. */
export type CatalogExerciseEntry = {
  slug: string;
  targetSets?: number;
  targetReps?: string;
  restSeconds?: number;
  notes?: string;
};

export type CatalogDayDef = {
  name: string;
  description?: string;
  entries: CatalogExerciseEntry[];
};

export function E(
  slug: string,
  sets: number,
  reps: string,
  rest = 90,
  notes?: string
): CatalogExerciseEntry {
  return { slug, targetSets: sets, targetReps: reps, restSeconds: rest, notes };
}

export function warm(slug: string, reps = "12-15"): CatalogExerciseEntry {
  return { slug, targetSets: 2, targetReps: reps, restSeconds: 45, notes: "Aufwärmen" };
}

export const PREMIUM_PPL_DAYS: CatalogDayDef[] = [
  {
    name: "Push",
    description: "Brust, Schultern, Trizeps — Aufwärmen, schwere Drückbewegungen, Isolation.",
    entries: [
      warm("push-up"),
      warm("face-pull"),
      E("barbell-bench-press", 4, "6-10", 120),
      E("incline-dumbbell-press", 3, "8-12", 90),
      E("dips-chest", 3, "8-12", 90),
      E("cable-crossover", 3, "12-15", 60),
      E("overhead-press", 3, "8-12", 90),
      E("lateral-raise", 3, "12-15", 60),
      E("rope-tricep-pushdown", 3, "10-15", 60),
      E("overhead-tricep-extension", 3, "10-15", 60),
    ],
  },
  {
    name: "Pull",
    description: "Rücken & Bizeps — vertikale & horizontale Züge, Rear Delts, Curls.",
    entries: [
      warm("lat-pulldown"),
      E("pull-up", 4, "6-10", 120),
      E("bent-over-barbell-row", 4, "8-10", 120),
      E("lat-pulldown", 3, "10-12", 90),
      E("t-bar-row", 3, "8-12", 90),
      E("straight-arm-pulldown", 3, "12-15", 60),
      E("face-pull", 3, "15-20", 60),
      E("barbell-curl", 3, "8-12", 60),
      E("hammer-curl", 3, "10-12", 60),
    ],
  },
  {
    name: "Legs",
    description: "Quadrizeps, Hamstrings, Gesäß — Kniebeuge, RDL, Beinpresse, Isolation.",
    entries: [
      warm("leg-extension"),
      E("barbell-back-squat", 4, "6-10", 150),
      E("romanian-deadlift", 3, "8-12", 120),
      E("leg-press", 3, "10-15", 90),
      E("walking-lunge", 3, "10-12", 90),
      E("leg-extension", 3, "12-15", 60),
      E("leg-curl-lying", 3, "10-15", 60),
      E("standing-calf-raise", 4, "12-15", 60),
    ],
  },
];

export const PREMIUM_UPPER_LOWER_DAYS: CatalogDayDef[] = [
  {
    name: "Upper",
    description: "Brust, Rücken, Schultern, Arme — 10–20 Sätze pro Muskelgruppe.",
    entries: [
      warm("face-pull"),
      E("barbell-bench-press", 4, "6-10", 120),
      E("incline-dumbbell-press", 3, "8-12", 90),
      E("pull-up", 3, "6-10", 120),
      E("bent-over-barbell-row", 3, "8-12", 90),
      E("overhead-press", 3, "8-12", 90),
      E("lateral-raise", 3, "12-15", 60),
      E("rope-tricep-pushdown", 3, "10-15", 60),
      E("barbell-curl", 3, "8-12", 60),
    ],
  },
  {
    name: "Lower",
    description: "Quadrizeps, Hamstrings, Gesäß, Waden — schwere Compound + Isolation.",
    entries: [
      warm("leg-extension"),
      E("barbell-back-squat", 4, "6-10", 150),
      E("romanian-deadlift", 3, "8-12", 120),
      E("leg-press", 3, "10-15", 90),
      E("leg-curl-lying", 3, "10-15", 60),
      E("leg-extension", 3, "12-15", 60),
      E("standing-calf-raise", 4, "12-15", 60),
    ],
  },
  {
    name: "Upper B",
    description: "Variation: Schrägbank, Latzug, Rear Delts — mehr Isolation.",
    entries: [
      warm("face-pull"),
      E("incline-dumbbell-press", 4, "8-12", 90),
      E("dumbbell-bench-press", 3, "8-12", 90),
      E("lat-pulldown", 3, "10-12", 90),
      E("seated-cable-row", 3, "10-12", 90),
      E("lateral-raise", 4, "12-15", 60),
      E("rear-delt-fly", 3, "12-15", 60),
      E("hammer-curl", 3, "10-12", 60),
      E("overhead-tricep-extension", 3, "10-15", 60),
    ],
  },
  {
    name: "Lower B",
    description: "Variation: Front Squat, Hip Thrust, Waden-Fokus.",
    entries: [
      warm("leg-curl-lying"),
      E("front-squat", 4, "6-10", 150),
      E("hip-thrust", 3, "8-12", 90),
      E("walking-lunge", 3, "10-12", 90),
      E("leg-extension", 3, "12-15", 60),
      E("leg-curl-seated", 3, "10-15", 60),
      E("seated-calf-raise", 4, "12-15", 60),
    ],
  },
];

export const PREMIUM_ARNOLD_DAYS: CatalogDayDef[] = [
  {
    name: "Brust & Rücken",
    description: "Arnold-Klassiker: Brust und Rücken im selben Training.",
    entries: [
      warm("push-up"),
      E("barbell-bench-press", 4, "8-12", 90),
      E("incline-dumbbell-press", 4, "8-12", 90),
      E("dumbbell-fly", 3, "12-15", 60),
      E("pull-up", 4, "6-10", 120),
      E("bent-over-barbell-row", 4, "8-12", 90),
      E("t-bar-row", 3, "8-12", 90),
      E("straight-arm-pulldown", 3, "12-15", 60),
    ],
  },
  {
    name: "Schultern & Arme",
    description: "Schultern, Bizeps und Trizeps — hohes Volumen.",
    entries: [
      warm("face-pull"),
      E("overhead-press", 4, "8-12", 90),
      E("lateral-raise", 4, "12-15", 60),
      E("rear-delt-fly", 3, "12-15", 60),
      E("barbell-curl", 4, "8-12", 60),
      E("hammer-curl", 3, "10-12", 60),
      E("rope-tricep-pushdown", 4, "10-15", 60),
      E("overhead-tricep-extension", 3, "10-15", 60),
    ],
  },
  {
    name: "Beine",
    description: "Quadrizeps, Hamstrings, Gesäß — volle Bein-Session.",
    entries: [
      warm("leg-extension"),
      E("barbell-back-squat", 5, "6-10", 150),
      E("leg-press", 4, "10-15", 90),
      E("romanian-deadlift", 4, "8-12", 120),
      E("leg-curl-lying", 3, "10-15", 60),
      E("leg-extension", 3, "12-15", 60),
      E("standing-calf-raise", 5, "12-15", 60),
    ],
  },
];

export const PREMIUM_SCIENCE_PPL_DAYS: CatalogDayDef[] = [
  {
    name: "Push",
    description: "Evidenzbasiert: RIR 1–3, progressive Überladung, 12–16 Brust-Sätze.",
    entries: [
      warm("push-up"),
      E("barbell-bench-press", 4, "6-10", 120, "Hauptübung"),
      E("incline-dumbbell-press", 3, "8-12", 90),
      E("dips-chest", 3, "8-12", 90),
      E("cable-crossover", 3, "12-15", 60),
      E("overhead-press", 3, "8-12", 90),
      E("lateral-raise", 4, "12-15", 60),
      E("rope-tricep-pushdown", 3, "10-15", 60),
    ],
  },
  {
    name: "Pull",
    description: "Lat-Fokus, horizontales Rudern, 14–18 Rücken-Sätze/Woche.",
    entries: [
      warm("lat-pulldown"),
      E("pull-up", 4, "6-10", 120, "Hauptübung"),
      E("bent-over-barbell-row", 4, "8-10", 120),
      E("seated-cable-row", 3, "10-12", 90),
      E("straight-arm-pulldown", 3, "12-15", 60),
      E("face-pull", 3, "15-20", 60),
      E("barbell-curl", 3, "8-12", 60),
    ],
  },
  {
    name: "Legs",
    description: "Quad + Hamstring Balance, 14–18 Bein-Sätze.",
    entries: [
      warm("leg-extension"),
      E("barbell-back-squat", 4, "6-10", 150, "Hauptübung"),
      E("romanian-deadlift", 3, "8-12", 120),
      E("leg-press", 3, "10-15", 90),
      E("leg-curl-lying", 3, "10-15", 60),
      E("leg-extension", 3, "12-15", 60),
      E("standing-calf-raise", 4, "12-15", 60),
    ],
  },
];

export function catalogDaysFromDefs(defs: CatalogDayDef[]) {
  return defs.map((d) => ({
    name: d.name,
    description: d.description,
    entries: d.entries,
    exerciseSlugs: d.entries.map((e) => e.slug),
  }));
}
