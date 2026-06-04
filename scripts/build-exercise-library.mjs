import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "exercise-data");
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "exercise-library.ts");

const header = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "exercise-library.ts"),
  "utf8"
)
  .split("// GENERATED_BELOW")[0]
  .trimEnd();

const files = [
  "chest.json",
  "back.json",
  "shoulders.json",
  "biceps.json",
  "triceps.json",
  "legs.json",
  "abs.json",
  "forearms.json",
  "calves.json",
  "cardio.json",
];

const all = files.flatMap((f) => JSON.parse(readFileSync(join(root, f), "utf8")));

const mins = {
  CHEST: 18,
  BACK: 18,
  SHOULDERS: 16,
  BICEPS: 12,
  TRICEPS: 12,
  LEGS: 22,
  ABS: 15,
  FOREARMS: 10,
  CALVES: 8,
  CARDIO: 12,
};

const counts = {};
for (const e of all) counts[e.muscleGroup] = (counts[e.muscleGroup] ?? 0) + 1;
for (const [g, m] of Object.entries(mins)) {
  if ((counts[g] ?? 0) < m) throw new Error(`${g}: ${counts[g]} < ${m}`);
}
if (all.length < 155) throw new Error(`total ${all.length} < 155`);
const slugs = new Set(all.map((e) => e.slug));
if (slugs.size !== all.length) throw new Error("duplicate slugs");

function fmt(e) {
  const inst = e.instructions.map((s) => JSON.stringify(s)).join(",\n      ");
  const prim = e.primaryMuscles.map((s) => JSON.stringify(s)).join(", ");
  const sec = e.secondaryMuscles.map((s) => JSON.stringify(s)).join(", ");
  return `  {
    slug: ${JSON.stringify(e.slug)},
    name: ${JSON.stringify(e.name)},
    muscleGroup: ${JSON.stringify(e.muscleGroup)},
    difficulty: ${JSON.stringify(e.difficulty)},
    description: ${JSON.stringify(e.description)},
    instructions: [
      ${inst},
    ],
    imageUrl: ${JSON.stringify(`/exercises/${e.slug}.jpg`)},
    equipment: ${JSON.stringify(e.equipment)},
    primaryMuscles: [${prim}],
    secondaryMuscles: [${sec}],
    isCompound: ${e.isCompound},
  }`;
}

writeFileSync(
  out,
  `${header}\n\nexport const EXERCISE_LIBRARY: ExerciseSeed[] = [\n${all.map(fmt).join(",\n")}\n];\n`
);
console.log("OK", all.length, counts);
