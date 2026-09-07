/**
 * Safe auth DB diagnostic — never prints passwords, hashes, or connection secrets.
 * Run: npx tsx scripts/diagnose-auth-login.ts [optional-email]
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  validateSupabaseDatabaseEnv,
  parseDatabaseUrl,
} from "../src/lib/database-url";
import { prisma, pingDatabase } from "../src/lib/prisma";
import { isEmailVerificationEnabled } from "../src/lib/verification";

async function main() {
  const emailArg = process.argv[2]?.toLowerCase().trim();

  const v = validateSupabaseDatabaseEnv();
  if (!v.ok) {
    console.log(
      JSON.stringify(
        { database_connection: "FAIL", issues: v.issues },
        null,
        2
      )
    );
    process.exit(1);
  }

  const parsed = parseDatabaseUrl(v.databaseUrl);
  const projectRef = parsed.user.replace(/^postgres\./, "");

  console.log("--- connection (masked) ---");
  console.log("DATABASE_URL:", v.databaseUrlMasked);
  console.log("DIRECT_URL:", v.directUrlMasked);
  console.log("project_ref:", projectRef);
  console.log("host:", parsed.host);
  console.log("port:", parsed.port);
  console.log(
    "EMAIL_VERIFICATION_enabled:",
    isEmailVerificationEnabled()
  );
  console.log(
    "AUTH_SECRET_set:",
    Boolean(
      process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
    )
  );

  const ok = await pingDatabase();
  console.log("database_connection:", ok ? "OK" : "FAIL");
  if (!ok) process.exit(1);

  const userCount = await prisma.user.count();
  const withHash = await prisma.user.count({
    where: { passwordHash: { not: null } },
  });
  const withGoogle = await prisma.account.count({
    where: { provider: "google" },
  });
  const verified = await prisma.user.count({
    where: { emailVerified: { not: null } },
  });
  const guests = await prisma.user.count({ where: { isGuest: true } });

  const sample = await prisma.user.findMany({
    take: 20,
    orderBy: { createdAt: "asc" },
    select: {
      email: true,
      role: true,
      isGuest: true,
      emailVerified: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  console.log("--- users overview ---");
  console.log(
    JSON.stringify(
      {
        userCount,
        withPasswordHash: withHash,
        withGoogleAccount: withGoogle,
        emailVerifiedCount: verified,
        guestCount: guests,
        sample: sample.map((u) => ({
          email: u.email,
          role: u.role,
          isGuest: u.isGuest,
          emailVerified: Boolean(u.emailVerified),
          password_hash_present: Boolean(u.passwordHash),
          hash_algo_prefix: u.passwordHash
            ? u.passwordHash.slice(0, 4)
            : null,
          createdAt: u.createdAt.toISOString().slice(0, 10),
        })),
      },
      null,
      2
    )
  );

  if (emailArg) {
    const user = await prisma.user.findUnique({
      where: { email: emailArg },
      select: {
        id: true,
        email: true,
        role: true,
        isGuest: true,
        emailVerified: true,
        passwordHash: true,
      },
    });

    const passwordFromEnv = process.env.AUTH_DIAG_PASSWORD;
    let password_verification: boolean | "skipped" = "skipped";
    if (user?.passwordHash && passwordFromEnv) {
      password_verification = await bcrypt.compare(
        passwordFromEnv,
        user.passwordHash
      );
    }

    console.log("--- lookup ---");
    console.log(
      JSON.stringify(
        {
          auth_provider: "credentials",
          email_queried: emailArg,
          user_found: Boolean(user),
          password_hash_present: Boolean(user?.passwordHash),
          email_verified: Boolean(user?.emailVerified),
          role: user?.role ?? null,
          isGuest: user?.isGuest ?? null,
          hash_algo_prefix: user?.passwordHash
            ? user.passwordHash.slice(0, 4)
            : null,
          password_verification,
          note:
            password_verification === "skipped"
              ? "Set AUTH_DIAG_PASSWORD env (temp) to test verify without printing it"
              : undefined,
        },
        null,
        2
      )
    );
  }
}

main()
  .catch((e) => {
    console.error("DIAG_FAIL", e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
