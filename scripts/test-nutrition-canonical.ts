/**
 * Canonical nutrition SSOT — cross-device calorieTarget must match.
 * Run: npx tsx scripts/test-nutrition-canonical.ts
 */

import type { Profile } from "@prisma/client";
import { nutritionTargetsFromProfile } from "../src/lib/calorie-target";
import {
  createEmptyNutritionDashboard,
  normalizeNutritionDashboard,
} from "../src/lib/nutrition-defaults";
import {
  preferCanonicalNutritionDashboard,
} from "../src/lib/nutrition-day-rollover";
import {
  nutritionDayKey,
  nutritionDayUtc,
  localDayRangeUtc,
  resolveNutritionDay,
  parseNutritionDayYmd,
} from "../src/lib/nutrition-day";
import {
  canonicalNutritionForDisplay,
  nutritionDashboardToHomeMacros,
} from "../src/lib/nutrition-to-home";
import {
  computeNutritionRemaining,
  resolveNutritionDisplayState,
} from "../src/lib/nutrition-display";
import { createEmptyHomeData } from "../src/lib/home-defaults";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

function dashWithTarget(calories: number, extras?: Partial<ReturnType<typeof createEmptyNutritionDashboard>>) {
  const base = createEmptyNutritionDashboard();
  return normalizeNutritionDashboard({
    ...base,
    profileComplete: true,
    empty: false,
    targets: {
      ...base.targets,
      calories,
      proteinG: 160,
      carbsG: 250,
      fatG: 70,
    },
    consumed: { ...base.consumed, calories: 400, proteinG: 30 },
    remaining: computeNutritionRemaining({
      targets: { calories, proteinG: 160, carbsG: 250, fatG: 70 },
      consumed: { calories: 400, proteinG: 30, carbsG: 0, fatG: 0 },
      exerciseBurned: { calories: 0, estimated: false },
    }),
    ...extras,
  });
}

console.log("Canonical nutrition / cross-device tests\n");

{
  const stored = nutritionTargetsFromProfile(
    {
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "MALE",
      activityLevel: "MODERATE",
      calorieTarget: 2400,
      proteinTargetG: 160,
      carbsTargetG: 250,
      fatTargetG: 70,
      waterTargetMl: 2500,
      nutritionGoal: "MAINTENANCE",
    } as Profile,
    { averageDailySteps: 22_000, averageActiveMinutes: 90 }
  );
  assert("stored calorieTarget ignores step context", stored.calories === 2400);
  assert("stored proteinTarget ignores step context", stored.proteinG === 160);
}

{
  const today = nutritionDayKey();
  const server = dashWithTarget(2400);
  const staleDesktop = dashWithTarget(2200);
  const staleMobile = dashWithTarget(2100);

  const desktopView = preferCanonicalNutritionDashboard(server, staleDesktop);
  const mobileView = preferCanonicalNutritionDashboard(server, staleMobile);

  assert("desktop uses server target", desktopView.targets.calories === 2400);
  assert("mobile uses server target", mobileView.targets.calories === 2400);
  assert("desktop === mobile calorieTarget", desktopView.targets.calories === mobileView.targets.calories);
  assert("desktop === mobile remaining", desktopView.remaining.calories === mobileView.remaining.calories);
  assert("date is local today", desktopView.date === today && mobileView.date === today);
}

{
  const staleDisk = dashWithTarget(1800);
  const serverYesterday = {
    ...dashWithTarget(2550),
    date: "2020-01-01",
  };
  const merged = preferCanonicalNutritionDashboard(serverYesterday, staleDisk);
  assert("UTC-mismatch keeps server target", merged.targets.calories === 2550);
  assert("UTC-mismatch uses local calendar day", merged.date === nutritionDayKey());
  assert("UTC-mismatch does not keep previous-day consumed", merged.consumed.calories === 0);
}

{
  const diskOnly = dashWithTarget(1900);
  const fromDisk = preferCanonicalNutritionDashboard(null, diskOnly);
  assert("disk used only when server has no target", fromDisk.targets.calories === 1900);
}

{
  assert("parse ymd", parseNutritionDayYmd("2026-09-11T12:00") === "2026-09-11");
  const utc = nutritionDayUtc("2026-09-11");
  assert("utc midnight", utc.toISOString() === "2026-09-11T00:00:00.000Z");
  const range = localDayRangeUtc("2026-09-11", -120);
  assert(
    "CEST local midnight window",
    range.from.toISOString() === "2026-09-10T22:00:00.000Z"
  );
  const resolved = resolveNutritionDay({
    day: "2026-09-11",
    tzOffset: -120,
  });
  assert("resolve ymd", resolved.ymd === "2026-09-11");
  assert("resolve date utc", resolved.date.toISOString() === "2026-09-11T00:00:00.000Z");
}

{
  const dash = dashWithTarget(2300);
  const homeMacros = nutritionDashboardToHomeMacros(dash);
  assert("home calorieTarget === dashboard target", homeMacros.calorieTarget === 2300);
  assert(
    "home remaining === dashboard remaining",
    homeMacros.caloriesRemaining === Math.max(0, Math.round(dash.remaining.calories))
  );

  const display = resolveNutritionDisplayState(dash);
  assert("display ready", display.kind === "ready");
  if (display.kind === "ready") {
    assert("display target === 2300", display.target === 2300);
  }
}

{
  const emptyCentral = createEmptyNutritionDashboard();
  const home = createEmptyHomeData();
  home.calorieTarget = 2600;
  home.proteinTarget = 170;
  home.nutrition = dashWithTarget(2600);
  const displayDash = canonicalNutritionForDisplay(emptyCentral, home);
  assert(
    "home fallback uses boot nutrition target",
    displayDash.targets.calories === 2600
  );

  const centralWins = canonicalNutritionForDisplay(dashWithTarget(2400), home);
  assert("central store wins when it has a target", centralWins.targets.calories === 2400);
}

{
  const remaining = computeNutritionRemaining({
    targets: { calories: 2400, proteinG: 160, carbsG: 250, fatG: 70 },
    consumed: { calories: 800, proteinG: 40, carbsG: 80, fatG: 20 },
    exerciseBurned: { calories: 200, estimated: false },
  });
  assert("remaining formula target - consumed + burned", remaining.calories === 1800);
}

{
  const a = preferCanonicalNutritionDashboard(dashWithTarget(2400), dashWithTarget(2000));
  const b = preferCanonicalNutritionDashboard(dashWithTarget(2400), dashWithTarget(2000));
  assert(
    "reload-equivalent payloads stay identical",
    a.targets.calories === b.targets.calories &&
      a.remaining.calories === b.remaining.calories &&
      a.consumed.calories === b.consumed.calories
  );
}

{
  const server = dashWithTarget(2400);
  let deviceA = preferCanonicalNutritionDashboard(server, dashWithTarget(2200));
  let deviceB = preferCanonicalNutritionDashboard(server, dashWithTarget(2100));
  assert("A cache 2200 → 2400", deviceA.targets.calories === 2400);
  assert("B cache 2100 → 2400", deviceB.targets.calories === 2400);

  const afterA = dashWithTarget(2500);
  deviceB = preferCanonicalNutritionDashboard(afterA, deviceB);
  assert("A changed 2500 → B reload 2500", deviceB.targets.calories === 2500);

  const afterB = dashWithTarget(2300);
  deviceA = preferCanonicalNutritionDashboard(afterB, deviceA);
  assert("B changed 2300 → A reload 2300", deviceA.targets.calories === 2300);
}

{
  const sameBurn = { calories: 180, estimated: false };
  const server = dashWithTarget(2400, { exerciseBurned: sameBurn });
  const a = preferCanonicalNutritionDashboard(server, dashWithTarget(2200, { exerciseBurned: { calories: 50, estimated: true } }));
  const b = preferCanonicalNutritionDashboard(server, dashWithTarget(2100, { exerciseBurned: { calories: 400, estimated: true } }));
  assert(
    "same server activity → same exerciseBurned",
    a.exerciseBurned?.calories === 180 && b.exerciseBurned?.calories === 180
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
