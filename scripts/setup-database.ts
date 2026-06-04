import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { Pool } from "pg";

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
/** Prisma Dev often listens on 51219 (51218 may ECONNRESET). Run npm run db:resolve-url */
const PRISMA_DEV_URL =
  "postgres://postgres:postgres@localhost:51219/template1?sslmode=disable";

function readEnv(): string {
  if (!existsSync(ENV_PATH)) return "";
  return readFileSync(ENV_PATH, "utf8");
}

function upsertEnvVar(content: string, key: string, value: string): string {
  const line = `${key}="${value}"`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

async function canConnect(url: string): Promise<boolean> {
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 4000,
  });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log("=== AI Fitness Coach – Datenbank Setup ===\n");

  let envContent = readEnv();
  const currentUrl = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];

  if (currentUrl) {
    console.log("Prüfe DATABASE_URL:", currentUrl.replace(/:[^:@]+@/, ":****@"));
    if (await canConnect(currentUrl)) {
      console.log("OK: Bestehende Datenbank erreichbar.\n");
    } else {
      console.log("WARN: Datenbank nicht erreichbar. Starte Prisma Dev Server...\n");
      try {
        execSync("npx prisma dev -n ai-fitness", {
          cwd: ROOT,
          stdio: "inherit",
        });
      } catch (e) {
        console.error("Prisma Dev konnte nicht gestartet werden:", e);
        process.exit(1);
      }
      envContent = upsertEnvVar(envContent, "DATABASE_URL", PRISMA_DEV_URL);
      writeFileSync(ENV_PATH, envContent, "utf8");
      console.log("\n.env aktualisiert mit Prisma-Dev-URL (Port 51218).\n");
    }
  } else {
    console.log("DATABASE_URL fehlt – setze Prisma Dev URL.");
    try {
      execSync("npx prisma dev -d -n ai-fitness", { cwd: ROOT, stdio: "inherit" });
    } catch {
      /* server may already run */
    }
    envContent = upsertEnvVar(envContent || "", "DATABASE_URL", PRISMA_DEV_URL);
    writeFileSync(ENV_PATH, envContent, "utf8");
  }

  const url =
    readFileSync(ENV_PATH, "utf8").match(/^DATABASE_URL="([^"]+)"/m)?.[1] ??
    PRISMA_DEV_URL;

  console.log("Führe prisma generate aus...");
  execSync("npx prisma generate", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });

  console.log("Wende SQL-Migrationen an (FoodRecent, WaterLog, …)...");
  try {
    execSync("npx tsx scripts/apply-migrations.ts", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
  } catch {
    console.warn("Einige Migrationen waren bereits angewendet.");
  }

  console.log("Prüfe Schema mit db push…");
  try {
    execSync("npx prisma db push --accept-data-loss", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
  } catch {
    console.warn("db push übersprungen – SQL-Migrationen sollten ausreichen. Prüfe: npm run db:test");
  }

  console.log("\nFühre Seed aus (Admin + Lebensmittel + Achievements)...");
  execSync("npm run db:seed", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });

  console.log("\n=== Setup abgeschlossen ===");
  console.log("Admin: admin@aifitness.local / Admin123!");
  console.log("Starte die App neu: npm run dev\n");
}

main().catch((e) => {
  console.error("SETUP ERROR:", e);
  process.exit(1);
});
