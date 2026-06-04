/**
 * Supabase PostgreSQL — Prisma 7 datasource (nur für CLI: db push, migrate, studio).
 *
 * Prisma 7 unterstützt kein `directUrl` mehr in der Config — nur `url`.
 * Daher muss `url` auf DIRECT_URL (5432) zeigen, nicht auf den Transaction-Pooler (6543).
 *
 * Runtime: Prisma Client nutzt DATABASE_URL (6543) via @prisma/adapter-pg — siehe src/lib/prisma.ts
 * @see https://www.prisma.io/docs/orm/overview/databases/supabase#specific-considerations
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl = process.env["DIRECT_URL"]?.trim();
if (!directUrl) {
  throw new Error(
    "DIRECT_URL fehlt. Supabase Dashboard → Database → Session pooler oder Direct connection (Port 5432)."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
