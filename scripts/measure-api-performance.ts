/**
 * Misst Server-seitige Ladezeiten pro Feature (ohne Browser).
 * Ausführen: npm run perf:measure
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "../src/lib/prisma";
import { loadHomeData } from "../src/lib/home-data";
import { loadNutritionDashboard } from "../src/lib/nutrition-service";
import { loadGamificationHomeCard } from "../src/lib/gamification-home";
import { loadGamificationPayload } from "../src/lib/gamification-payload";
import { loadHealthDashboard } from "../src/lib/activity-health";
import { loadTrainingSnapshot } from "../src/lib/training-snapshot";
import { buildWeeklyReport } from "../src/lib/weekly-report";
import { loadMuscleRecovery } from "../src/lib/recovery-service";
import { startOfDay } from "date-fns";

type Row = { label: string; ms: number; category: string };

async function timeIt(
  rows: Row[],
  category: string,
  label: string,
  fn: () => Promise<unknown>
) {
  const t0 = performance.now();
  try {
    await fn();
    rows.push({ category, label, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    rows.push({
      category,
      label: `${label} (FEHLER)`,
      ms: Math.round(performance.now() - t0),
    });
    console.error(label, e);
  }
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error("Kein Admin-User — npm run db:seed");
    process.exit(1);
  }

  const userId = user.id;
  const today = startOfDay(new Date());
  const rows: Row[] = [];

  console.log("=== API / DB Performance (Server) ===\n");
  console.log("User:", user.email, "\n");

  await timeIt(rows, "Hauptseiten", "GET /api/home (loadHomeData)", () =>
    loadHomeData(userId)
  );
  await timeIt(rows, "Hauptseiten", "GET /api/nutrition/dashboard", () =>
    loadNutritionDashboard(userId, today)
  );
  await timeIt(rows, "Hauptseiten", "GET /api/workouts (training snapshot)", () =>
    loadTrainingSnapshot(userId)
  );
  await timeIt(rows, "Hauptseiten", "GET /api/activities/dashboard (health)", () =>
    loadHealthDashboard(userId)
  );
  await timeIt(rows, "Hauptseiten", "GET /api/profile (user+profile)", async () => {
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } }),
      prisma.profile.findUnique({ where: { userId } }),
    ]);
  });

  await timeIt(rows, "Gamification", "GET /api/gamification?summary=1", () =>
    loadGamificationHomeCard(userId)
  );
  await timeIt(rows, "Gamification", "GET /api/gamification (FULL)", () =>
    loadGamificationPayload(userId, { runUnlockCheck: false })
  );

  await timeIt(rows, "Zusatz (früher auf Home)", "buildWeeklyReport", () =>
    buildWeeklyReport(userId)
  );
  await timeIt(rows, "Zusatz (früher auf Home)", "loadMuscleRecovery", () =>
    loadMuscleRecovery(userId)
  );

  rows.sort((a, b) => b.ms - a.ms);

  console.log("--- Langsamste zuerst (ms) ---\n");
  for (const r of rows) {
    console.log(`${String(r.ms).padStart(6)} ms  [${r.category}] ${r.label}`);
  }

  const fullGam = rows.find((r) => r.label.includes("FULL"));
  const home = rows.find((r) => r.label.includes("loadHomeData"));
  console.log("\n--- Analyse ---");
  if (fullGam && home && fullGam.ms > home.ms * 2) {
    console.log(
      `Ursache Gamification: Vollpayload (${fullGam.ms}ms) ist ~${Math.round(fullGam.ms / home.ms)}× langsamer als Home (${home.ms}ms).`
    );
  }
  if (home && home.ms > 300) {
    console.log(
      `Home-Bundle (${home.ms}ms): parallel nutrition+health+training+activity — prefetch von /api/home blockiert andere Tabs.`
    );
  }

  const totalPrefetch =
    rows
      .filter((r) =>
        ["loadHomeData", "nutrition", "gamification", "health", "training snapshot", "profile"].some(
          (k) => r.label.toLowerCase().includes(k.toLowerCase().replace("get /api/", ""))
        )
      )
      .reduce((s, r) => s + r.ms, 0);
  console.log(
    `\nGeschätzte Last bei globalem Prefetch (alle APIs parallel): ~${totalPrefetch}ms CPU/DB gesamt`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
