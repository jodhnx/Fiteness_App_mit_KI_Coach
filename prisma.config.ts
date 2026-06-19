/**
 * Supabase PostgreSQL — Prisma 7 datasource (CLI: db push, migrate, studio).
 * Uses DIRECT_URL (5432) — validated via database-url.ts
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getDirectDatabaseUrl } from "./src/lib/database-url";

const directUrl = getDirectDatabaseUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
