import { config } from "dotenv";
config({ path: ".env", override: true });
import { prisma, pingDatabase } from "../src/lib/prisma";
import { ensureAdminUser, ADMIN_EMAIL } from "../src/lib/ensure-admin";
import bcrypt from "bcryptjs";
import { ADMIN_PASSWORD } from "../src/lib/ensure-admin";

async function main() {
  console.log("=== Supabase Verbindungstest ===\n");

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("✗ DATABASE_URL fehlt");
    process.exit(1);
  }
  if (!process.env.DIRECT_URL?.trim()) {
    console.error("✗ DIRECT_URL fehlt (für Migrationen)");
    process.exit(1);
  }
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (/localhost|127\.0\.0\.1|:5121[789]\b/.test(dbUrl)) {
    console.error("✗ DATABASE_URL ist noch localhost — Supabase URL in .env eintragen");
    process.exit(1);
  }
  const forbidden = ["YOUR-PASSWORD", "DEIN_DB_PASSWORT", "PASSWORT_HIER"];
  if (forbidden.some((token) => dbUrl.includes(token)) || /postgres\.\[/i.test(dbUrl)) {
    console.error(
      "✗ DATABASE_URL enthält noch Platzhalter — postgres.hdvitxmxrpsjfgsdbfst + echtes Passwort eintragen"
    );
    process.exit(1);
  }
  if (!dbUrl.includes("postgres.hdvitxmxrpsjfgsdbfst")) {
    console.error(
      "✗ DATABASE_URL muss Benutzer postgres.hdvitxmxrpsjfgsdbfst enthalten (nicht postgres.[…])"
    );
    process.exit(1);
  }

  const ok = await pingDatabase();
  if (!ok) {
    console.error("✗ Verbindung fehlgeschlagen");
    process.exit(1);
  }
  console.log("✓ DATABASE CONNECTED (Pooler)");

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 5
  `;
  console.log("✓ Tabellen (Auszug):", tables.map((t) => t.tablename).join(", ") || "(keine)");

  const userCount = await prisma.user.count();
  console.log("✓ User count:", userCount);

  await ensureAdminUser();
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin?.passwordHash) {
    console.error("✗ Admin fehlt");
    process.exit(1);
  }
  const valid = await bcrypt.compare(ADMIN_PASSWORD, admin.passwordHash);
  console.log(valid ? "✓ Admin Passwort OK" : "✗ Admin Passwort falsch");

  console.log("\nRegistrierung/Login: npm run dev → /register und /login");
  console.log("Admin:", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
}

main()
  .catch((e) => {
    console.error("VERIFY FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
