/**
 * Full database vs Prisma schema audit.
 * Run: npx tsx scripts/test-database.ts
 */
import "dotenv/config";
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const EXPECTED_TABLES = [
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "PasswordResetToken",
  "Profile",
  "ExerciseLibrary",
  "WorkoutPlan",
  "WorkoutDay",
  "WorkoutExercise",
  "WorkoutSession",
  "WorkoutSet",
  "PersonalRecord",
  "FavoriteExercise",
  "TrainingStreak",
  "ExerciseRating",
  "RecentExercise",
  "WorkoutTemplate",
  "Goal",
  "NutritionPlan",
  "FoodItem",
  "FoodSearchHistory",
  "FoodFavorite",
  "FoodRecent",
  "WaterLog",
  "Recipe",
  "RecipeIngredient",
  "Meal",
  "MealItem",
  "EnduranceActivity",
  "ProgressEntry",
  "ProgressPhoto",
  "AIChat",
  "AIChatMessage",
  "AIRecommendation",
  "Achievement",
  "UserAchievement",
  "Level",
  "XPTransaction",
  "Challenge",
  "UserChallenge",
  "Friend",
  "Notification",
  "ActivityLog",
  "ErrorReport",
  "AIUsageLog",
  "WearableConnection",
  "Streak",
] as const;

const CRITICAL_FKS: { table: string; constraint: string }[] = [
  { table: "FoodRecent", constraint: "FoodRecent_userId_fkey" },
  { table: "FoodRecent", constraint: "FoodRecent_foodItemId_fkey" },
  { table: "WaterLog", constraint: "WaterLog_userId_fkey" },
  { table: "FoodFavorite", constraint: "FoodFavorite_foodItemId_fkey" },
  { table: "MealItem", constraint: "MealItem_foodItemId_fkey" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("FAIL: DATABASE_URL missing");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 10000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let failed = 0;

  try {
    await pool.query("SELECT 1");
    console.log("OK: Connection\n");

    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const existing = new Set(tables.map((t) => t.tablename));

    console.log("=== Table audit ===");
    for (const name of EXPECTED_TABLES) {
      if (existing.has(name)) {
        console.log(`  OK  ${name}`);
      } else {
        console.log(`  MISSING  ${name}`);
        failed++;
      }
    }

    console.log("\n=== Foreign keys (critical) ===");
    for (const { table, constraint } of CRITICAL_FKS) {
      if (!existing.has(table)) {
        console.log(`  SKIP  ${constraint} (table ${table} missing)`);
        failed++;
        continue;
      }
      const fk = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = ${table}
            AND constraint_name = ${constraint}
            AND constraint_type = 'FOREIGN KEY'
        ) AS "exists"
      `;
      if (fk[0]?.exists) console.log(`  OK  ${constraint}`);
      else {
        console.log(`  MISSING  ${constraint}`);
        failed++;
      }
    }

    console.log("\n=== Prisma model smoke tests ===");
    const smoke: { label: string; run: () => Promise<unknown> }[] = [
      { label: "User.count", run: () => prisma.user.count() },
      { label: "FoodItem.findFirst", run: () => prisma.foodItem.findFirst() },
      { label: "FoodRecent.findMany", run: () => prisma.foodRecent.findMany({ take: 1 }) },
      { label: "WaterLog.findMany", run: () => prisma.waterLog.findMany({ take: 1 }) },
      { label: "FoodSearchHistory.findMany", run: () =>
        prisma.foodSearchHistory.findMany({ take: 1 }) },
      { label: "Meal.findMany", run: () => prisma.meal.findMany({ take: 1 }) },
      { label: "EnduranceActivity.findMany", run: () =>
        prisma.enduranceActivity.findMany({ take: 1 }) },
    ];

    for (const { label, run } of smoke) {
      try {
        await run();
        console.log(`  OK  ${label}`);
      } catch (e) {
        console.log(`  FAIL  ${label}: ${e instanceof Error ? e.message : e}`);
        failed++;
      }
    }

    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const dirs = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((d) => d !== "migration_lock.toml")
      : [];
    console.log(`\nMigrations on disk: ${dirs.length}`);
    dirs.forEach((d) => console.log(`  - ${d}`));

    if (failed > 0) {
      console.log(`\nRESULT: ${failed} issue(s) — run: npx prisma migrate deploy`);
      process.exit(1);
    }
    console.log("\nRESULT: All checks passed");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
