import { pingDatabase } from "@/lib/prisma";
import {
  getSafeDbConnectionMeta,
  validateSupabaseDatabaseEnv,
} from "@/lib/database-url";
import { jsonOk, jsonError } from "@/lib/api-response";

/**
 * Public health probe — no secrets, no user data.
 * Separates application / database / prisma / auth configuration.
 */
export async function GET() {
  try {
    const hasAuthSecret = Boolean(
      process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
    );
    const hasSupabaseUrl = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
        process.env.SUPABASE_URL?.trim()
    );
    const hasSupabaseKey = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.SUPABASE_ANON_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    );

    const env = validateSupabaseDatabaseEnv();
    const dbMeta = getSafeDbConnectionMeta();

    if (!env.ok) {
      return jsonOk(
        {
          ok: false,
          application: "ok",
          database: "misconfigured",
          prisma: "unchecked",
          auth: hasAuthSecret ? "configured" : "missing_secret",
          supabase: {
            url: hasSupabaseUrl ? "configured" : "missing",
            key: hasSupabaseKey ? "configured" : "missing",
          },
          connection: {
            hasDatabaseUrl: dbMeta.hasDatabaseUrl,
            hasDirectUrl: dbMeta.hasDirectUrl,
            environment: dbMeta.environment,
          },
          issues: env.issues,
        },
        503
      );
    }

    const connected = await pingDatabase();
    if (!connected) {
      return jsonOk(
        {
          ok: false,
          application: "ok",
          database: "unreachable",
          prisma: "error",
          auth: hasAuthSecret ? "configured" : "missing_secret",
          supabase: {
            url: hasSupabaseUrl ? "configured" : "missing",
            key: hasSupabaseKey ? "configured" : "missing",
          },
          connection: {
            hasDatabaseUrl: dbMeta.hasDatabaseUrl,
            hasDirectUrl: dbMeta.hasDirectUrl,
            databaseHost: dbMeta.databaseHost,
            databasePort: dbMeta.databasePort,
            runtimeHost: dbMeta.runtimeHost,
            runtimePort: dbMeta.runtimePort,
            poolingMode: dbMeta.poolingMode,
            poolingEnabled: dbMeta.poolingEnabled,
            environment: dbMeta.environment,
          },
        },
        503
      );
    }

    return jsonOk({
      ok: true,
      application: "ok",
      database: "ok",
      prisma: "ok",
      auth: hasAuthSecret ? "configured" : "missing_secret",
      supabase: {
        url: hasSupabaseUrl ? "configured" : "missing",
        key: hasSupabaseKey ? "configured" : "missing",
      },
      connection: {
        hasDatabaseUrl: dbMeta.hasDatabaseUrl,
        hasDirectUrl: dbMeta.hasDirectUrl,
        databaseHost: dbMeta.databaseHost,
        databasePort: dbMeta.databasePort,
        runtimeHost: dbMeta.runtimeHost,
        runtimePort: dbMeta.runtimePort,
        poolingMode: dbMeta.poolingMode,
        poolingEnabled: dbMeta.poolingEnabled,
        environment: dbMeta.environment,
      },
    });
  } catch {
    return jsonError("service_unavailable", 503);
  }
}
