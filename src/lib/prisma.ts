import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { isDatabaseConnectionError } from "@/lib/prisma-errors";
import {
  logDatabaseConnected,
  logDatabaseError,
  logDatabaseQueryStart,
  logDatabaseQuerySuccess,
} from "@/lib/db-log";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

let pool: Pool | undefined = globalForPrisma.pool;
let client: PrismaClient | undefined = globalForPrisma.prisma;

function getConnectionString(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_URL fehlt. Supabase: Settings → Database → Transaction pooler (6543)."
    );
  }
  if (/localhost|127\.0\.0\.1|:5121[789]\b/.test(raw)) {
    throw new Error(
      "DATABASE_URL zeigt auf localhost. Bitte Supabase Transaction-URL in .env setzen."
    );
  }
  if (/:6543\b/.test(raw) && !/[?&]pgbouncer=true/i.test(raw)) {
    throw new Error(
      "DATABASE_URL (Port 6543) benötigt ?pgbouncer=true — sonst: prepared statement Fehler mit Supavisor."
    );
  }
  return raw;
}

function poolConfig(connectionString: string): PoolConfig {
  const isSupabase = /supabase\.co/i.test(connectionString);
  const isVercel = Boolean(process.env.VERCEL);

  return {
    connectionString,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: isVercel ? 5_000 : 20_000,
    max: isVercel ? 1 : 5,
    keepAlive: true,
    allowExitOnIdle: !isVercel,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  };
}

function createPool(): Pool {
  const connectionString = getConnectionString();
  const p = new Pool(poolConfig(connectionString));

  p.on("error", (err) => {
    logDatabaseError(err);
    void resetPrismaClient();
  });

  return p;
}

function buildPrismaClient(): PrismaClient {
  pool = createPool();
  const adapter = new PrismaPg(pool);
  const prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
    globalForPrisma.prisma = prismaClient;
  }

  return prismaClient;
}

export async function resetPrismaClient(): Promise<void> {
  if (client) {
    await client.$disconnect().catch((e) => logDatabaseError(e));
    client = undefined;
    globalForPrisma.prisma = undefined;
  }
  if (pool) {
    await pool.end().catch((e) => logDatabaseError(e));
    pool = undefined;
    globalForPrisma.pool = undefined;
  }
}

export function getPrismaClient(): PrismaClient {
  if (!client) {
    client = buildPrismaClient();
  }
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const db = getPrismaClient();
    const value = Reflect.get(db, prop, receiver) as unknown;
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(db);
    }
    return value;
  },
});

async function tryPgPing(connectionString: string): Promise<boolean> {
  const probe = new Pool({
    ...poolConfig(connectionString),
    max: 1,
  });
  try {
    await probe.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await probe.end().catch((e) => logDatabaseError(e));
  }
}

export async function pingDatabase(): Promise<boolean> {
  const verboseDb =
    process.env.NODE_ENV === "development" && process.env.DEBUG_DB === "1";
  if (verboseDb) logDatabaseQueryStart("ping");

  let connectionString: string;
  try {
    connectionString = getConnectionString();
  } catch (e) {
    logDatabaseError(e);
    return false;
  }

  if (!(await tryPgPing(connectionString))) {
    logDatabaseError(
      "Supabase nicht erreichbar. Prüfe DATABASE_URL, Passwort und ob das Projekt aktiv ist."
    );
    await resetPrismaClient();
    return false;
  }

  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    if (verboseDb) {
      logDatabaseConnected();
      logDatabaseQuerySuccess("ping");
    }
    return true;
  } catch (error) {
    logDatabaseError(error);
    await resetPrismaClient();
    return false;
  }
}

const RETRY_DELAY_MS = [300, 600, 1200];

export async function dbQuery<T>(
  label: string,
  fn: (db: PrismaClient) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  const verboseDb =
    process.env.NODE_ENV === "development" && process.env.DEBUG_DB === "1";
  if (verboseDb) logDatabaseQueryStart(label);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(getPrismaClient());
      if (verboseDb) logDatabaseQuerySuccess(label);
      return result;
    } catch (error) {
      lastError = error;
      logDatabaseError(error);

      if (isDatabaseConnectionError(error) && attempt < maxAttempts) {
        await resetPrismaClient();
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt - 1] ?? 1200));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
