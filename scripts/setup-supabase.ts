import "dotenv/config";
import { execSync } from "child_process";
import path from "path";
import { validateSupabaseDatabaseEnv } from "../src/lib/database-url";

const ROOT = path.resolve(__dirname, "..");

function main() {
  console.log("=== Supabase Setup ===\n");
  const validation = validateSupabaseDatabaseEnv();
  if (!validation.ok) {
    console.error("FEHLER: Ungültige Datenbank-Konfiguration:");
    for (const issue of validation.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log("DATABASE_URL:", validation.databaseUrlMasked);
  console.log("DIRECT_URL:", validation.directUrlMasked);

  console.log("1/3 prisma generate …");
  execSync("npx prisma generate", { cwd: ROOT, stdio: "inherit" });

  console.log("\n2/3 prisma db push (prisma.config.ts → DIRECT_URL / 5432) …");
  execSync("npx prisma db push", { cwd: ROOT, stdio: "inherit", env: process.env });

  console.log("\n3/3 Seed (Admin + Basisdaten) …");
  execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit", env: process.env });

  console.log("\n=== Fertig ===");
  console.log("Admin: admin@aifitness.local / Admin123!");
  console.log("Test: npm run db:verify-supabase && npm run auth:test");
}

main();
