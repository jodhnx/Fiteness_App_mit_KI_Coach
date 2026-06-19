import "dotenv/config";
import dns from "node:dns/promises";
import {
  validateSupabaseDatabaseEnv,
  parseDatabaseUrl,
  maskDatabaseUrl,
  explainSupabasePoolerError,
  flattenErrorMessage,
} from "../src/lib/database-url";
import { prisma } from "../src/lib/prisma";

async function checkProjectDns(user: string): Promise<string | null> {
  const ref = user.replace(/^postgres\./, "");
  if (!/^[a-z0-9]+$/.test(ref)) return null;
  const host = `db.${ref}.supabase.co`;
  try {
    await dns.lookup(host);
    return null;
  } catch {
    return `DNS: ${host} existiert nicht — Supabase-Projekt „${ref}" ist gelöscht, pausiert oder die Referenz in .env ist falsch.`;
  }
}

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

  const dnsIssue = await checkProjectDns(validation.user);
  if (dnsIssue) {
    console.error("\n✗", dnsIssue);
    console.error(
      "\n-> Supabase Dashboard: neues Projekt oder korrekte URLs aus Connect -> Prisma kopieren."
    );
    process.exit(1);
  }
  console.log("\n✓ DNS für Supabase-Projekt OK");

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
