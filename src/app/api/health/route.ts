import { dbQuery, pingDatabase } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api-response";
import { isEmailConfigured } from "@/lib/email";
import { ensureAdminUser, hasAdminUser, ADMIN_EMAIL } from "@/lib/ensure-admin";

export async function GET() {
  try {
    const connected = await pingDatabase();
    if (!connected) {
      return jsonError(
        "Datenbank nicht erreichbar. Prüfe Supabase DATABASE_URL und npm run db:verify-supabase",
        503
      );
    }

    let adminEnsured = false;
    if (!(await hasAdminUser())) {
      await ensureAdminUser();
      adminEnsured = true;
    }
    const userCount = await dbQuery("health.userCount", (db) => db.user.count());
    return jsonOk({
      status: "ok",
      service: "AI Fitness Coach Pro",
      database: "connected",
      userCount,
      adminEnsured,
      adminEmail: adminEnsured ? ADMIN_EMAIL : undefined,
      emailConfigured: isEmailConfigured(),
      resendKeyPresent: Boolean(process.env.RESEND_API_KEY?.trim()),
      authSecretConfigured: Boolean(
        process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
      ),
    });
  } catch (error) {
    console.error("HEALTH CHECK ERROR:", error);
    const msg = error instanceof Error ? error.message : "Database unreachable";
    const hint = msg.includes("ECONNREFUSED") || msg.includes("connect")
      ? "Datenbank nicht erreichbar. Terminal: npm run db:start (oder docker compose up -d), dann npm run db:diagnose"
      : "npm run db:push && npm run db:diagnose";
    return jsonError(`${msg}. ${hint}`, 503);
  }
}
