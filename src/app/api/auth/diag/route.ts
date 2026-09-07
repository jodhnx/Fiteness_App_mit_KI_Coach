import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, pingDatabase } from "@/lib/prisma";
import {
  validateSupabaseDatabaseEnv,
  parseDatabaseUrl,
} from "@/lib/database-url";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-response";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Temporary secure auth diagnostic.
 * Enabled only when AUTH_DIAG_SECRET is set.
 * Header: x-nexform-diag-key: <AUTH_DIAG_SECRET>
 *
 * Never returns passwords, hashes, secrets, or connection strings.
 */
const bodySchema = z.object({
  email: z.string().email().max(320),
  /** Optional — only used for password_verification boolean */
  password: z.string().min(1).max(128).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.AUTH_DIAG_SECRET?.trim();
    if (!expected) {
      return jsonError("Not found", 404);
    }

    const provided = req.headers.get("x-nexform-diag-key")?.trim() ?? "";
    if (!provided || provided !== expected) {
      return jsonError("Unauthorized", 401);
    }

    const limit = rateLimit(`auth-diag:${req.headers.get("x-forwarded-for") ?? "local"}`, 20, 900_000);
    if (!limit.success) {
      return jsonError("Rate limited", 429);
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonError("Ungültige Anfrage", 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const env = validateSupabaseDatabaseEnv();
    const connectionOk = env.ok ? await pingDatabase() : false;

    let projectRef: string | null = null;
    let host: string | null = null;
    let port: string | null = null;
    if (env.ok) {
      try {
        const p = parseDatabaseUrl(env.databaseUrl);
        projectRef = p.user.replace(/^postgres\./, "") || null;
        host = p.host;
        port = p.port;
      } catch {
        /* ignore */
      }
    }

    let userFound = false;
    let passwordHashPresent = false;
    let passwordVerification: boolean | null = null;
    let emailVerified = false;

    if (connectionOk) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          passwordHash: true,
          emailVerified: true,
        },
      });
      userFound = Boolean(user);
      passwordHashPresent = Boolean(user?.passwordHash);
      emailVerified = Boolean(user?.emailVerified);
      if (user?.passwordHash && parsed.data.password) {
        passwordVerification = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
      }
    }

    return jsonOk({
      database_connection: connectionOk ? "OK" : "FAIL",
      env_ok: env.ok,
      env_issues: env.ok ? [] : env.issues,
      project_ref: projectRef,
      host,
      port,
      user_found: userFound,
      password_hash_present: passwordHashPresent,
      email_verified: emailVerified,
      password_verification: passwordVerification,
      auth_provider: "credentials",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
