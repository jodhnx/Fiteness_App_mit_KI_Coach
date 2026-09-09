/**
 * Deep connection probe mirroring login authorize path.
 * Never prints secrets.
 */
import "dotenv/config";
import { prisma, pingDatabase, dbQuery, resetPrismaClient } from "../src/lib/prisma";
import {
  validateSupabaseDatabaseEnv,
  isDatabaseConfigError,
  flattenErrorMessage,
  explainSupabasePoolerError,
  parseDatabaseUrl,
  maskDatabaseUrl,
} from "../src/lib/database-url";
import { isDatabaseConnectionError } from "../src/lib/prisma-errors";
import dns from "node:dns/promises";

async function main() {
  const env = validateSupabaseDatabaseEnv();
  console.log("env_ok:", env.ok);
  if (!env.ok) {
    console.log("env_issues:", env.issues);
    process.exit(1);
  }
  console.log("DATABASE_URL:", env.databaseUrlMasked);
  console.log("DIRECT_URL:", env.directUrlMasked);

  const parsed = parseDatabaseUrl(env.databaseUrl);
  console.log("user:", parsed.user, "host:", parsed.host, "port:", parsed.port);

  // DNS for pooler host (actual runtime host)
  try {
    const r = await dns.lookup(parsed.host);
    console.log("pooler_dns: OK", r.address);
  } catch (e) {
    console.log("pooler_dns: FAIL", e instanceof Error ? e.message : e);
  }

  // DNS for db.<ref>.supabase.co — informational only (session pooler may not need it)
  const ref = parsed.user.replace(/^postgres\./, "");
  try {
    await dns.lookup(`db.${ref}.supabase.co`);
    console.log("direct_db_dns: OK");
  } catch {
    console.log(
      "direct_db_dns: NXDOMAIN (OK if DIRECT_URL uses pooler:5432 session mode)"
    );
  }

  const ping1 = await pingDatabase();
  console.log("pingDatabase:", ping1 ? "OK" : "FAIL");

  try {
    const user = await dbQuery("probe.findUnique", (db) =>
      db.user.findUnique({
        where: { email: "benst2018@gmail.com" },
        select: { id: true, passwordHash: true, emailVerified: true },
      })
    );
    console.log("authorize_lookup_path:", {
      found: Boolean(user),
      hasHash: Boolean(user?.passwordHash),
    });
  } catch (e) {
    const flat = flattenErrorMessage(e);
    console.log("authorize_lookup_FAIL:", flat);
    console.log("isDatabaseConnectionError:", isDatabaseConnectionError(e));
    console.log("isDatabaseConfigError:", isDatabaseConfigError(e));
    console.log("pooler_hint:", explainSupabasePoolerError(flat));
  }

  // Second ping after reset (simulates serverless cold reconnect)
  await resetPrismaClient();
  const ping2 = await pingDatabase();
  console.log("ping_after_reset:", ping2 ? "OK" : "FAIL");

  // Count
  const count = await prisma.user.count();
  console.log("user_count:", count);
}

main()
  .catch((e) => {
    console.error("FATAL", flattenErrorMessage(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
