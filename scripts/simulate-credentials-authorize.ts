/**
 * Simulate credentials authorize() against current DB — never prints secrets.
 * Optional: AUTH_DIAG_EMAIL + AUTH_DIAG_PASSWORD for a real verify check.
 * Always tests admin bootstrap password against DB if available in env (dev).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma, pingDatabase } from "../src/lib/prisma";
import { loginSchema } from "../src/lib/validations";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../src/lib/ensure-admin";
import { isEmailVerificationEnabled, isEmailVerified } from "../src/lib/verification";

async function simulateAuthorize(emailRaw: string, password: string) {
  const parsed = loginSchema.safeParse({ email: emailRaw, password });
  if (!parsed.success) {
    return { step: "parse", ok: false, issues: parsed.error.flatten().fieldErrors };
  }
  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      emailVerified: true,
      isGuest: true,
    },
  });
  if (!user) {
    return {
      step: "lookup",
      ok: false,
      database_connection: "OK",
      user_found: false,
      password_hash_present: false,
      password_verification: false,
      auth_provider: "credentials",
    };
  }
  if (!user.passwordHash) {
    return {
      step: "lookup",
      ok: false,
      user_found: true,
      password_hash_present: false,
      password_verification: false,
      auth_provider: "credentials",
    };
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  const verificationRequired = isEmailVerificationEnabled();
  const verified = isEmailVerified(user.emailVerified);
  const wouldBlockUnverified = verificationRequired && !verified && !user.isGuest;
  return {
    step: "complete",
    ok: valid && !wouldBlockUnverified,
    database_connection: "OK",
    user_found: true,
    password_hash_present: true,
    password_verification: valid,
    email_verified: verified,
    verification_would_block: wouldBlockUnverified,
    role: user.role,
    hash_algo_prefix: user.passwordHash.slice(0, 4),
    auth_provider: "credentials",
  };
}

async function main() {
  const connected = await pingDatabase();
  console.log("database_connection:", connected ? "OK" : "FAIL");
  if (!connected) process.exit(1);

  // Wrong password sanity — must be false
  const wrong = await simulateAuthorize("benst2018@gmail.com", "__definitely_wrong_password__");
  console.log("known_user_wrong_password:", JSON.stringify(wrong));

  // Unknown email
  const unknown = await simulateAuthorize("nobody-exists-xyz@example.com", "SomePass123!");
  console.log("unknown_email:", JSON.stringify(unknown));

  // Admin bootstrap password (dev env only — never print password)
  if (ADMIN_PASSWORD) {
    const admin = await simulateAuthorize(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("admin_bootstrap_password_check:", JSON.stringify({
      email: ADMIN_EMAIL,
      ...admin,
      used_bootstrap_password_from_env: true,
    }));
  } else {
    console.log("admin_bootstrap_password_check: skipped (no bootstrap password in env/production)");
  }

  const diagEmail = process.env.AUTH_DIAG_EMAIL?.toLowerCase().trim();
  const diagPassword = process.env.AUTH_DIAG_PASSWORD;
  if (diagEmail && diagPassword) {
    const diag = await simulateAuthorize(diagEmail, diagPassword);
    console.log("AUTH_DIAG_check:", JSON.stringify({ email: diagEmail, ...diag }));
  } else {
    console.log(
      "AUTH_DIAG_check: skipped (set AUTH_DIAG_EMAIL + AUTH_DIAG_PASSWORD temporarily to verify a real account)"
    );
  }
}

main()
  .catch((e) => {
    console.error("FAIL", e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
