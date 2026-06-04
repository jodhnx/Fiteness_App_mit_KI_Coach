import { prisma } from "@/lib/prisma";

const KEY_LIFTS = [
  "bankdruecken",
  "bench-press",
  "kniebeuge",
  "squat",
  "kreuzheben",
  "deadlift",
  "schulterdruecken",
  "overhead-press",
  "klimmzug",
  "pull-up",
  "rudern",
  "row",
];

export type PrExerciseCard = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  currentKg: number;
  startKg: number | null;
  improvementPct: number | null;
  achievedAt: string;
  history: { label: string; value: number }[];
};

export async function buildPrCenter(userId: string): Promise<PrExerciseCard[]> {
  const records = await prisma.personalRecord.findMany({
    where: { userId, recordType: "MAX_WEIGHT" },
    include: { exercise: true },
    orderBy: { achievedAt: "asc" },
  });

  const byExercise = new Map<string, typeof records>();
  for (const r of records) {
    const list = byExercise.get(r.exerciseLibraryId) ?? [];
    list.push(r);
    byExercise.set(r.exerciseLibraryId, list);
  }

  const cards: PrExerciseCard[] = [];
  for (const [exerciseId, list] of byExercise) {
    const sorted = [...list].sort(
      (a, b) => a.achievedAt.getTime() - b.achievedAt.getTime()
    );
    const current = sorted[sorted.length - 1];
    const start = sorted[0];
    const currentKg = current.weightKg ?? current.value;
    const startKg = start.weightKg ?? start.value;
    const improvementPct =
      startKg > 0 ? Math.round(((currentKg - startKg) / startKg) * 100) : null;

    cards.push({
      exerciseId,
      name: current.exercise.name,
      muscleGroup: current.exercise.muscleGroup,
      currentKg,
      startKg: sorted.length > 1 ? startKg : null,
      improvementPct,
      achievedAt: current.achievedAt.toISOString(),
      history: sorted.slice(-8).map((r, i) => ({
        label: `#${i + 1}`,
        value: r.weightKg ?? r.value,
      })),
    });
  }

  cards.sort((a, b) => {
    const aKey = KEY_LIFTS.some((k) => a.name.toLowerCase().includes(k)) ? 0 : 1;
    const bKey = KEY_LIFTS.some((k) => b.name.toLowerCase().includes(k)) ? 0 : 1;
    return aKey - bKey || b.currentKg - a.currentKg;
  });

  return cards;
}
