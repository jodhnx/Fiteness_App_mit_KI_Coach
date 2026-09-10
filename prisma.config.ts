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
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });
loadEnv();

function cliDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;

  const pooled = process.env.DATABASE_URL?.trim();
  if (pooled) return pooled;

  // `prisma generate` does not open a connection. Keep CLI usable when env
  // is injected later by Next/Vercel instead of this process.
  return "postgresql://127.0.0.1:5432/postgres";
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
