import "dotenv/config";
import { prisma, pingDatabase } from "../src/lib/prisma";
import { validateSupabaseDatabaseEnv } from "../src/lib/database-url";
import { ensureAdminUser, ADMIN_EMAIL, ADMIN_PASSWORD } from "../src/lib/ensure-admin";
import bcrypt from "bcryptjs";

async function main() {
  console.log("=== Supabase Verbindungstest ===\n");

  const validation = validateSupabaseDatabaseEnv();
  if (!validation.ok) {
    console.error("✗ Konfiguration:");
    for (const issue of validation.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  console.log("DATABASE_URL:", validation.databaseUrlMasked);
  console.log("DIRECT_URL:", validation.directUrlMasked);
  console.log("Host:", validation.host, "| User:", validation.user, "| Port:", validation.port);

  const ok = await pingDatabase();
  if (!ok) {
    console.error("✗ Ping fehlgeschlagen — siehe Fehler oben");
    process.exit(1);
  }
  console.log("✓ DATABASE CONNECTED (Pooler)");

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 5
  `;
  console.log("✓ Tabellen (Auszug):", tables.map((t) => t.tablename).join(", ") || "(keine)");

  const userCount = await prisma.user.count();
  console.log("✓ prisma.user.count():", userCount);

  await ensureAdminUser();
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin?.passwordHash) {
    console.error("✗ Admin fehlt");
    process.exit(1);
  }
  const valid = await bcrypt.compare(ADMIN_PASSWORD, admin.passwordHash);
  console.log(valid ? "✓ Admin Passwort OK" : "✗ Admin Passwort falsch");

  console.log("\nRegistrierung/Login: npm run dev → /register und /login");
  console.log("Admin:", ADMIN_EMAIL);
}

main()
  .catch((e) => {
    console.error("VERIFY FAILED:");
    if (e instanceof Error) {
      console.error(" ", e.message);
      if (e.cause instanceof Error) console.error("  Ursache:", e.cause.message);
    } else {
      console.error(" ", e);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
