import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { validateSupabaseDatabaseEnv, explainSupabasePoolerError, flattenErrorMessage } from "../src/lib/database-url";

async function main() {
  console.log("=== Prisma Connection Test ===\n");

  const validation = validateSupabaseDatabaseEnv();
  if (!validation.ok) {
    console.error("✗ Konfiguration ungültig:");
    for (const issue of validation.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  console.log("DATABASE_URL (maskiert):", validation.databaseUrlMasked);
  console.log("DIRECT_URL (maskiert):", validation.directUrlMasked);
  console.log("Host:", validation.host);
  console.log("User:", validation.user);
  console.log("Port:", validation.port);

  try {
    const count = await prisma.user.count();
    console.log("\n✓ prisma.user.count() =", count);
  } catch (error) {
    console.error("\n✗ prisma.user.count() fehlgeschlagen:");
    const flat = flattenErrorMessage(error);
    console.error("  Meldung:", flat);
    const hint = explainSupabasePoolerError(flat);
    if (hint) console.error("\n  Diagnose:", hint);
    else if (error instanceof Error) console.error("  Typ:", error.constructor.name);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
