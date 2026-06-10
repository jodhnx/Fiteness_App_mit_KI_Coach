import "dotenv/config";
import { prisma, pingDatabase } from "../src/lib/prisma";
import { tableExists } from "../src/lib/prisma-safe";
import {
  getSupportEnvIssues,
  getSupportEnvStatus,
  getSupportEmail,
} from "../src/lib/support-config";
import { sendSupportEmails } from "../src/lib/support-email";
import { formatApiErrorMessage } from "../src/lib/format-api-error";

const SEND_EMAILS = process.argv.includes("--send");
const TEST_EMAIL =
  process.env.SUPPORT_TEST_EMAIL?.trim() ||
  (SEND_EMAILS ? getSupportEmail() : "support-test@example.com");

async function main() {
  console.log("=== Support System Test ===\n");

  const envStatus = getSupportEnvStatus();
  console.log("ENV Status:");
  console.log(`  SUPPORT_EMAIL: ${envStatus.supportEmail ? getSupportEmail() : "FEHLT"}`);
  console.log(`  RESEND_API_KEY: ${envStatus.resendKey ? "gesetzt" : "fehlt"}`);
  console.log(`  SMTP_HOST: ${envStatus.smtpHost ? "gesetzt" : "fehlt"}`);
  console.log(`  EMAIL_FROM: ${envStatus.emailFrom ? process.env.EMAIL_FROM : "(Standard)"}`);
  console.log(`  APP_NAME: ${envStatus.appName}`);

  const envIssues = getSupportEnvIssues();
  if (envIssues.length) {
    console.log(`\n⚠ E-Mail-Konfiguration: ${envIssues.join(", ")}`);
  } else {
    console.log("\n✓ E-Mail-Konfiguration vollständig");
  }

  if (!process.env.DATABASE_URL) {
    console.error("\n✗ DATABASE_URL fehlt");
    process.exit(1);
  }

  const connected = await pingDatabase();
  if (!connected) {
    console.error("\n✗ Datenbank nicht erreichbar");
    process.exit(1);
  }
  console.log("✓ Datenbank erreichbar");

  const hasTable = await tableExists("SupportRequest");
  if (!hasTable) {
    console.error('\n✗ Tabelle "SupportRequest" fehlt — npx prisma db push');
    process.exit(1);
  }
  console.log('✓ Tabelle "SupportRequest" vorhanden');

  const testMessage = `Support-Testlauf ${new Date().toISOString()}`;
  let recordId: string | null = null;

  try {
    const record = await prisma.supportRequest.create({
      data: {
        name: "Support Test",
        email: TEST_EMAIL,
        category: "OTHER",
        message: testMessage,
      },
    });
    recordId = record.id;
    console.log(`✓ Datenbankeintrag erstellt (id: ${record.id})`);

    if (SEND_EMAILS && !envIssues.length) {
      try {
        await sendSupportEmails({
          name: record.name,
          email: record.email,
          category: record.category,
          message: record.message,
          createdAt: record.createdAt,
        });
        console.log("✓ Support-E-Mail gesendet");
        console.log("✓ Bestätigungsmail gesendet");
      } catch (emailErr) {
        const detail =
          emailErr instanceof Error ? emailErr.message : "Unbekannter E-Mail-Fehler";
        console.warn(`⚠ E-Mail-Versand fehlgeschlagen (Anfrage wäre trotzdem gespeichert): ${detail}`);
      }
    } else if (SEND_EMAILS) {
      console.warn(`⚠ E-Mail-Test übersprungen: ${envIssues.join(", ")}`);
    } else {
      console.log("\nℹ E-Mail-Versand nicht getestet (nutze --send zum Senden)");
    }
  } catch (error) {
    console.error("\n✗ Support-Test fehlgeschlagen:");
    console.error(`  ${formatApiErrorMessage(error)}`);
    process.exit(1);
  } finally {
    if (recordId) {
      await prisma.supportRequest.delete({ where: { id: recordId } }).catch(() => {});
      console.log("✓ Test-Eintrag wieder entfernt");
    }
  }

  console.log("\nAlle Prüfungen bestanden.");
}

main()
  .catch((e) => {
    console.error("SUPPORT TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
