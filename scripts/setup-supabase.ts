/**
 * Supabase Setup: Schema pushen + Seed (Admin).
 * Voraussetzung: DATABASE_URL + DIRECT_URL in .env (Supabase Dashboard).
 */
import { config } from "dotenv";
config({ path: ".env", override: true });
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function requireEnv(name: string) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`FEHLER: ${name} fehlt in .env`);
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1|:5121[789]\b/.test(v)) {
    console.error(`FEHLER: ${name} darf nicht auf localhost zeigen (Supabase erforderlich).`);
    process.exit(1);
  }
  if (/YOUR-PASSWORD|\[PASSWORD\]|postgres\.\[/i.test(v)) {
    console.error(
      `FEHLER: ${name} enthält noch Platzhalter — echte Supabase-URL mit postgres.hdvitxmxrpsjfgsdbfst eintragen.`
    );
    process.exit(1);
  }
  if (name === "DATABASE_URL") {
    if (!v.includes("postgres.hdvitxmxrpsjfgsdbfst")) {
      console.error(
        "FEHLER: DATABASE_URL muss postgres.hdvitxmxrpsjfgsdbfst als DB-User enthalten."
      );
      process.exit(1);
    }
    if (!/:6543\b/.test(v)) {
      console.error("FEHLER: DATABASE_URL muss Port 6543 (Transaction pooler) nutzen.");
      process.exit(1);
    }
    if (!/[?&]pgbouncer=true/i.test(v)) {
      console.error("FEHLER: DATABASE_URL muss ?pgbouncer=true enthalten.");
      process.exit(1);
    }
  }
  if (name === "DIRECT_URL" && /:6543\b/.test(v)) {
    console.error(
      "FEHLER: DIRECT_URL darf nicht Port 6543 nutzen — Session/Direct (5432) für db push."
    );
    process.exit(1);
  }
  return v;
}

function main() {
  console.log("=== Supabase Setup ===\n");
  requireEnv("DATABASE_URL");
  requireEnv("DIRECT_URL");

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
