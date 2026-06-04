/**
 * Test achievement / gamification APIs (DB + payload loaders).
 * Run: npx tsx scripts/test-achievement-apis.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { loadAchievementsWithProgress } from "../src/lib/achievement-engine";
import { loadGamificationPayload } from "../src/lib/gamification-payload";
import { loadGamificationHomeCard } from "../src/lib/gamification-home";

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!user) {
    console.error("No user in DB — register or seed first");
    process.exit(1);
  }

  console.log("User:", user.email);

  const schema = await prisma.achievement.findMany({
    take: 3,
    select: { slug: true, metricKey: true, targetValue: true, tier: true },
  });
  console.log("Sample achievements:", schema);

  const nullMetrics = await prisma.achievement.count({
    where: { metricKey: null },
  });
  console.log("Achievements without metricKey:", nullMetrics);
  if (nullMetrics > 0) {
    console.error("FAIL: run backfill-achievement-metrics");
    process.exit(1);
  }

  const t0 = Date.now();
  const home = await loadGamificationHomeCard(user.id);
  console.log("loadGamificationHomeCard OK", Date.now() - t0, "ms", {
    level: home.level.level,
    unlocked: home.unlockedCount,
  });

  const t1 = Date.now();
  const progress = await loadAchievementsWithProgress(user.id);
  console.log("loadAchievementsWithProgress OK", Date.now() - t1, "ms", {
    count: progress.length,
    earned: progress.filter((a) => a.earned).length,
  });

  const t2 = Date.now();
  const full = await loadGamificationPayload(user.id, { runUnlockCheck: false });
  console.log("loadGamificationPayload OK", Date.now() - t2, "ms", {
    totalXP: full.totalXP,
    achievements: full.achievements.length,
    challenges: full.challenges.length,
  });

  console.log("\nAll achievement API tests passed.");
}

main()
  .catch((e) => {
    console.error("TEST FAIL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
