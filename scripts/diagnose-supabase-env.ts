import "dotenv/config";
import dns from "node:dns/promises";
import {
  validateSupabaseDatabaseEnv,
  parseDatabaseUrl,
  explainSupabasePoolerError,
  flattenErrorMessage,
} from "../src/lib/database-url";
import { prisma, pingDatabase } from "../src/lib/prisma";

async function main() {
  console.log("=== Datenbank-Diagnose ===\n");

  const validation = validateSupabaseDatabaseEnv();
  if (!validation.ok) {
    console.error("✗ Konfiguration ungültig:");
    for (const issue of validation.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  console.log("DATABASE_URL:", validation.databaseUrlMasked);
  console.log("DIRECT_URL:", validation.directUrlMasked);
  console.log("Host:", validation.host);
  console.log("User:", validation.user);
  console.log("Port:", validation.port);

  // Check the host we actually connect to (pooler), not db.<ref>.supabase.co
  try {
    const parsed = parseDatabaseUrl(validation.databaseUrl);
    await dns.lookup(parsed.host);
    console.log("\n✓ DNS für Pooler-Host OK:", parsed.host);
  } catch (e) {
    console.error("\n✗ Pooler-DNS fehlgeschlagen:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const ping = await pingDatabase();
  if (!ping) {
    console.error("\n✗ pingDatabase fehlgeschlagen");
    process.exit(1);
  }
  console.log("✓ pingDatabase OK");

  try {
    const count = await prisma.user.count();
    console.log("✓ prisma.user.count() =", count);
    console.log("\nRegistrierung und Login sollten funktionieren.");
  } catch (error) {
    const flat = flattenErrorMessage(error);
    console.error("\n✗ prisma.user.count() fehlgeschlagen:");
    console.error(" ", flat);
    const hint = explainSupabasePoolerError(flat);
    if (hint) console.error("\n Diagnose:", hint);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
