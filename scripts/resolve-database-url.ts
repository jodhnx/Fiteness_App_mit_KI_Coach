/**
 * Finds a working Prisma Dev Postgres port (51217–51219) and prints the DATABASE_URL.
 * Port 51218 in .env often fails with ECONNRESET; the active PG port is usually 51219.
 */
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { Pool } from "pg";

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const PORTS = [51219, 51218, 51217];
const DATABASES = ["template1", "postgres"];

async function tryUrl(connectionString: string): Promise<boolean> {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 4000,
    max: 1,
  });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  for (const port of PORTS) {
    for (const db of DATABASES) {
      const url = `postgres://postgres:postgres@localhost:${port}/${db}?sslmode=disable`;
      if (await tryUrl(url)) {
        console.log("OK:", url.replace(/:[^:@]+@/, ":****@"));

        if (existsSync(ENV_PATH)) {
          let content = readFileSync(ENV_PATH, "utf8");
          const line = `DATABASE_URL="${url}"`;
          if (/^DATABASE_URL=/m.test(content)) {
            content = content.replace(/^DATABASE_URL=.*$/m, line);
          } else {
            content = `${content.trimEnd()}\n${line}\n`;
          }
          writeFileSync(ENV_PATH, content, "utf8");
          console.log("Updated .env DATABASE_URL");
        } else {
          console.log(`Set in .env:\nDATABASE_URL="${url}"`);
        }
        return;
      }
    }
  }

  console.error("No working Prisma Dev port found. Run: npm run db:start (keep terminal open)");
  process.exit(1);
}

main();
