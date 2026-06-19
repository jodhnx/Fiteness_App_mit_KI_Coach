import "dotenv/config";
import { Pool } from "pg";
import { parseDatabaseUrl, maskDatabaseUrl } from "../src/lib/database-url";

async function tryConnect(label: string, connectionString: string) {
  const masked = maskDatabaseUrl(connectionString);
  console.log(`\n--- ${label} ---`);
  console.log(masked);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12_000,
    max: 1,
  });
  try {
    const r = await pool.query("SELECT current_user, inet_server_addr()::text AS host");
    console.log("✓ OK", r.rows[0]);
    const count = await pool.query('SELECT count(*)::int AS c FROM "User"');
    console.log("✓ User count:", count.rows[0]?.c);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("✗ FAIL:", msg);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  const ref = "hdvitxmxrpsjfgsdbfst";
  const pass = parseDatabaseUrl(process.env.DATABASE_URL ?? "").password;

  const candidates: [string, string][] = [];

  if (process.env.DATABASE_URL) {
    candidates.push(["DATABASE_URL (env)", process.env.DATABASE_URL]);
  }
  if (process.env.DIRECT_URL) {
    candidates.push(["DIRECT_URL (env)", process.env.DIRECT_URL]);
  }

  // Supabase direct host (not pooler)
  candidates.push([
    "Direct db.PROJECT.supabase.co:5432",
    `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@db.${ref}.supabase.co:5432/postgres`,
  ]);

  // Session pooler alternate format
  candidates.push([
    "Pooler session mode user=postgres (legacy)",
    `postgresql://postgres:${encodeURIComponent(pass)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?options=project%3D${ref}`,
  ]);

  for (const [label, url] of candidates) {
    if (await tryConnect(label, url)) {
      console.log("\n=== WORKING URL FOUND ===");
      console.log("Use this format:", maskDatabaseUrl(url));
      return;
    }
  }

  console.log("\n=== No working connection ===");
  process.exit(1);
}

main();
