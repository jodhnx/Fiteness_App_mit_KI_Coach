/**
 * Ensure NutritionPlan meal-plan schema exists (Day/Meal/Item + new columns).
 * Loads .env.local without printing secrets.
 *
 * Run: npm run db:ensure-nutrition-plans
 *
 * Root cause this fixes: Prisma Client expects NutritionPlanDay/Meal/Item and
 * columns (durationDays, status, …) but production DB may still have the old
 * stub NutritionPlan (calories/proteinG/carbsG/fatG only) — P2021/P2022.
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

loadEnv({ path: ".env.local" });
loadEnv();

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const r = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [name]
  );
  return Boolean(r.rows[0]?.exists);
}

async function columnExists(
  pool: Pool,
  table: string,
  column: string
): Promise<boolean> {
  const r = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS exists`,
    [table, column]
  );
  return Boolean(r.rows[0]?.exists);
}

async function applySchema(pool: Pool) {
  const hasPlan = await tableExists(pool, "NutritionPlan");
  const hasDay = await tableExists(pool, "NutritionPlanDay");
  const hasMeal = await tableExists(pool, "NutritionPlanMeal");
  const hasItem = await tableExists(pool, "NutritionPlanItem");
  const hasDuration = hasPlan
    ? await columnExists(pool, "NutritionPlan", "durationDays")
    : false;
  const hasStatus = hasPlan
    ? await columnExists(pool, "NutritionPlan", "status")
    : false;
  const hasOldCalories = hasPlan
    ? await columnExists(pool, "NutritionPlan", "calories")
    : false;

  console.log("NutritionPlan:", hasPlan);
  console.log("  durationDays:", hasDuration);
  console.log("  status:", hasStatus);
  console.log("  legacy calories column:", hasOldCalories);
  console.log("NutritionPlanDay:", hasDay);
  console.log("NutritionPlanMeal:", hasMeal);
  console.log("NutritionPlanItem:", hasItem);

  const needsMigration =
    !hasPlan ||
    !hasDay ||
    !hasMeal ||
    !hasItem ||
    !hasDuration ||
    !hasStatus ||
    hasOldCalories;

  if (!needsMigration) {
    console.log("DIAGNOSIS: Nutrition meal-plan schema OK — no action needed");
    return;
  }

  console.log(
    "DIAGNOSIS: Schema mismatch — applying migration 20260917_nutrition_meal_plans"
  );

  const sqlPath = join(
    process.cwd(),
    "prisma/migrations/20260917_nutrition_meal_plans/migration.sql"
  );
  const sql = readFileSync(sqlPath, "utf8");
  await pool.query(sql);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `);
    const existing = await pool.query(
      `SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $1 LIMIT 1`,
      ["20260917_nutrition_meal_plans"]
    );
    if (existing.rowCount === 0) {
      await pool.query(
        `INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
         VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
        [
          crypto.randomUUID(),
          "ensure-nutrition-plan-schema",
          "20260917_nutrition_meal_plans",
        ]
      );
    }
  } catch (e) {
    console.warn("Could not record _prisma_migrations entry:", e);
  }

  const okDay = await tableExists(pool, "NutritionPlanDay");
  const okDuration = await columnExists(pool, "NutritionPlan", "durationDays");
  if (!okDay || !okDuration) {
    throw new Error("migration ran but schema still incomplete");
  }

  console.log("OK: Nutrition meal-plan schema applied");
}

async function main() {
  const candidates = [
    process.env.DIRECT_URL?.trim(),
    process.env.DATABASE_URL?.trim(),
  ].filter((u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i);

  if (candidates.length === 0) {
    console.error("FAIL: DATABASE_URL / DIRECT_URL not set (check .env.local)");
    process.exit(1);
  }

  let lastError: unknown = null;

  for (const url of candidates) {
    let host = "(unparsed)";
    try {
      host = new URL(url.replace(/^postgresql:/i, "http:")).hostname;
    } catch {
      /* ignore */
    }
    console.log("Trying host:", host);

    const pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 20_000,
      ssl: /supabase|amazonaws|neon\.tech/i.test(url)
        ? { rejectUnauthorized: false }
        : undefined,
    });

    try {
      await pool.query("SELECT 1");
      console.log("OK: database reachable");
      await applySchema(pool);
      await pool.end().catch(() => {});
      process.exit(0);
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("  failed:", msg.slice(0, 180));
      await pool.end().catch(() => {});
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  if (/Can't reach|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|timeout/i.test(msg)) {
    console.error("FAIL: Database not reachable (P1001 / network)");
    console.error("  Apply when online: npm run db:ensure-nutrition-plans");
    console.error("  Or: npx prisma migrate deploy");
  } else {
    console.error("FAIL:", msg);
  }
  process.exit(1);
}

main();
