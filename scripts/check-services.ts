import "dotenv/config";
import { Pool } from "pg";
import net from "net";

const APP_PORT = Number(process.env.PORT ?? 3000);
const DB_URL = process.env.DATABASE_URL;

function maskUrl(url: string) {
  return url.replace(/:[^:@]+@/, ":****@");
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port, timeout: 2000 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function checkDatabase(): Promise<{ ok: boolean; message: string }> {
  if (!DB_URL) {
    return {
      ok: false,
      message: "DATABASE_URL fehlt in .env — kopiere .env.example nach .env",
    };
  }

  const pool = new Pool({
    connectionString: DB_URL,
    connectionTimeoutMillis: 4000,
  });
  try {
    await pool.query("SELECT 1");
    return { ok: true, message: `Datenbank OK (${maskUrl(DB_URL)})` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = DB_URL.includes("5121")
      ? "Starte die DB: npm run db:start (Terminal offen lassen), dann: npm run db:resolve-url"
      : DB_URL.includes("5432")
        ? "Starte Docker-Postgres mit: docker compose up -d"
        : "Prüfe DATABASE_URL in .env";
    return {
      ok: false,
      message: `Datenbank nicht erreichbar: ${msg}\n  → ${hint}\n  → oder: npm run db:setup`,
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  console.log("=== AI Fitness Coach – Verbindungs-Check ===\n");

  const db = await checkDatabase();
  console.log(db.ok ? "✓" : "✗", "Datenbank:", db.message.split("\n")[0]);
  if (!db.ok) console.log(" ", db.message.split("\n").slice(1).join("\n  "));

  const appUp = await checkPort(APP_PORT);
  console.log(appUp ? "✓" : "✗", `App-Server (Port ${APP_PORT}):`, appUp ? "läuft" : "nicht erreichbar");

  const prismaDevPort = await checkPort(51218);
  const dockerPgPort = await checkPort(5432);
  console.log(
    "  Hinweis: Prisma-Dev-DB Port 51218:",
    prismaDevPort ? "offen" : "geschlossen",
    "| Docker-Postgres 5432:",
    dockerPgPort ? "offen" : "geschlossen"
  );

  if (!appUp) {
    console.log("\n--- App starten ---");
    console.log("  npm run dev");
    console.log("  Dann im Browser: http://localhost:" + APP_PORT);
  }

  if (!db.ok) {
    console.log("\n--- Datenbank starten ---");
    console.log("  Option A: npm run db:start   # Terminal OFFEN lassen (nicht schließen!)");
    console.log("  Option B: npm run db:docker  # Docker Postgres auf Port 5432");
    console.log("  Einrichtung: npm run db:setup");
    console.log("  Hinweis: db:start muss dauerhaft laufen — beendet sich nicht von selbst.");
  }

  if (db.ok) {
    try {
      const { execSync } = await import("child_process");
      execSync("npm run auth:test", { stdio: "inherit", env: process.env });
    } catch {
      console.log("\n⚠ Auth-Test fehlgeschlagen — npm run auth:test nach db:setup");
    }
  }

  if (db.ok && appUp) {
    console.log("\nAlles bereit. Health-Check: http://localhost:" + APP_PORT + "/api/health");
  }

  process.exit(db.ok && appUp ? 0 : 1);
}

main();
