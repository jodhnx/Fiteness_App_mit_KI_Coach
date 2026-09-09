/**
 * Prisma 7 CLI datasource (generate / migrate / studio).
 *
 * Prefer DIRECT_URL (session or direct :5432) for CLI DB access.
 * Fall back to DATABASE_URL so `prisma generate` still works when only
 * the runtime pooler URL is present (generate does not open a connection).
 *
 * Runtime Prisma Client uses getRuntimeDatabaseUrl() via @prisma/adapter-pg
 * (prefer DIRECT_URL :5432 / rewrite Transaction → Session; see src/lib/prisma.ts).
 */
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function cliDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;

  const pooled = process.env.DATABASE_URL?.trim();
  if (pooled) return pooled;

  // Clear Prisma error when neither variable is set
  return env("DIRECT_URL");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: cliDatabaseUrl(),
  },
});
