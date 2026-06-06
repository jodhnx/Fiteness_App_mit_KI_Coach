/**
 * Shared Prisma/pg client for all seed scripts.
 * Loads .env via dotenv (tsx does not use prisma.config.ts).
 * Uses DIRECT_URL (5432) for bulk seeds — same as `prisma db pull`.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

function getSeedConnectionString(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const pooled = process.env.DATABASE_URL?.trim();
  const url = direct || pooled;

  if (!url) {
    throw new Error(
      "DIRECT_URL oder DATABASE_URL fehlt. Supabase-URLs in .env eintragen (siehe .env.example)."
    );
  }

  if (/localhost|127\.0\.0\.1|:5121[789]\b/.test(url)) {
    throw new Error(
      `Seed-Verbindung zeigt auf localhost (${url.replace(/:[^:@]+@/, ":****@")}). Bitte Supabase DIRECT_URL in .env setzen.`
    );
  }

  return url;
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const isSupabase = /supabase\.co/i.test(connectionString);
  return {
    connectionString,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 20_000,
    max: 5,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  };
}

let pool: Pool | undefined;
let client: PrismaClient | undefined;

export function getSeedPrisma(): PrismaClient {
  if (!client) {
    const connectionString = getSeedConnectionString();
    pool = new Pool(buildPoolConfig(connectionString));
    client = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return client;
}

export async function disconnectSeedPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
