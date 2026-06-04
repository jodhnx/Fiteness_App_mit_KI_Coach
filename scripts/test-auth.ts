import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma, pingDatabase, dbQuery } from "../src/lib/prisma";
import { ensureAdminUser, ADMIN_EMAIL, ADMIN_PASSWORD } from "../src/lib/ensure-admin";

async function main() {
  console.log("=== Auth Flow Test ===\n");

  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL fehlt");
    process.exit(1);
  }

  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    console.error("✗ AUTH_SECRET / NEXTAUTH_SECRET fehlt — Login-Sessions funktionieren nicht");
    process.exit(1);
  }

  const connected = await pingDatabase();
  if (!connected) {
    console.error("✗ Datenbank nicht erreichbar");
    console.error("  → npm run db:start");
    process.exit(1);
  }
  console.log("✓ Datenbank erreichbar");

  const ensured = await ensureAdminUser();
  console.log(ensured.created ? "✓ Admin angelegt" : "✓ Admin aktualisiert", ADMIN_EMAIL);

  const user = await dbQuery("test.user.findUnique", (db) =>
    db.user.findUnique({ where: { email: ADMIN_EMAIL } })
  );
  if (!user?.passwordHash) {
    console.error("✗ USER NOT FOUND / kein Passwort-Hash");
    process.exit(1);
  }
  console.log("✓ USER FOUND", { id: user.id, role: user.role });

  const valid = await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash);
  if (!valid) {
    console.error("✗ PASSWORD INVALID");
    process.exit(1);
  }
  console.log("✓ PASSWORD VALID");

  if (!user.emailVerified) {
    console.error("✗ EMAIL NOT VERIFIED");
    process.exit(1);
  }
  console.log("✓ E-Mail verifiziert");

  if (!user.onboardingCompletedAt) {
    console.warn("⚠ Onboarding nicht abgeschlossen — wird gesetzt");
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompletedAt: new Date() },
    });
  }
  console.log("✓ Onboarding OK");

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  console.log(`\nAdmin-Konten: ${adminCount}`);
  console.log("\nLogin im Browser:");
  console.log(`  E-Mail: ${ADMIN_EMAIL}`);
  console.log(`  Passwort: ${ADMIN_PASSWORD}`);
  console.log("  URL: http://localhost:3000/login\n");
  console.log("Alle Prüfungen bestanden.");
}

main()
  .catch((e) => {
    console.error("AUTH TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
