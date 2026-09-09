import { pingDatabase } from "@/lib/prisma";
import { validateSupabaseDatabaseEnv } from "@/lib/database-url";
import { jsonOk, jsonError } from "@/lib/api-response";

/**
 * Public health probe — no secrets, no user data.
 * Checks env shape + live Prisma ping.
 */
export async function GET() {
  try {
    const env = validateSupabaseDatabaseEnv();
    if (!env.ok) {
      return jsonError("configuration_error", 503);
    }

    const connected = await pingDatabase();
    if (!connected) {
      return jsonError("database_unreachable", 503);
    }

    return jsonOk({
      status: "ok",
      database: "ok",
      provider: "postgresql",
    });
  } catch {
    return jsonError("service_unavailable", 503);
  }
}
