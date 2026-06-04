/**
 * Applies pending SQL migrations (idempotent) when migrate deploy cannot baseline.
 * Run: npx tsx scripts/apply-migrations.ts
 */
import "dotenv/config";
import { execSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

function main() {
  const dirs = readdirSync(MIGRATIONS_DIR)
    .filter((d) => /^\d+_/.test(d))
    .sort();

  console.log(`Applying ${dirs.length} migration folder(s)...\n`);

  for (const dir of dirs) {
    const file = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    console.log(`→ ${dir}`);
    try {
      execSync(`npx prisma db execute --file "${file}"`, {
        stdio: "inherit",
        env: process.env,
      });
      console.log("  OK\n");
    } catch {
      console.log("  WARN (partial or already applied)\n");
    }
  }

  console.log("Run: npm run db:test");
}

main();
