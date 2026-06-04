import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
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

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return "(missing)";
  return url.replace(/:[^:@]+@/, ":****@");
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    logDatabaseError("DATABASE_URL is not set");
  }

  const p = new Pool({
    connectionString,
    connectionTimeoutMillis: 12_000,
    idleTimeoutMillis: 20_000,
    max: 5,
    keepAlive: true,
    allowExitOnIdle: false,
  });

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

/** Lazy Prisma singleton — pool resets on connection errors via dbQuery(). */
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

const PRISMA_DEV_PORTS = [51219, 51218, 51217];

function candidateDatabaseUrls(): string[] {
  const primary = process.env.DATABASE_URL?.trim();
  const urls: string[] = [];
  if (primary) urls.push(primary);
  if (primary?.includes("51218")) {
    urls.push(primary.replace("51218", "51219"));
  }
  if (primary?.includes("51219")) {
    urls.push(primary.replace("51219", "51218"));
  }
  for (const port of PRISMA_DEV_PORTS) {
    urls.push(
      `postgres://postgres:postgres@localhost:${port}/template1?sslmode=disable`
    );
  }
  return [...new Set(urls)];
}

async function tryPgPing(connectionString: string): Promise<boolean> {
  const probe = new Pool({
    connectionString,
    connectionTimeoutMillis: 8_000,
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

/** Raw pg ping — tries Prisma Dev ports if DATABASE_URL fails (51218 often resets). */
async function pingPgPool(): Promise<boolean> {
  for (const url of candidateDatabaseUrls()) {
    if (await tryPgPing(url)) {
      if (url !== process.env.DATABASE_URL) {
        process.env.DATABASE_URL = url;
        await resetPrismaClient();
      }
      return true;
    }
  }
  return false;
}

/** Ping DB; reconnects pool once on failure. */
export async function pingDatabase(): Promise<boolean> {
  const verboseDb =
    process.env.NODE_ENV === "development" && process.env.DEBUG_DB === "1";
  if (verboseDb) logDatabaseQueryStart("ping");

  if (!(await pingPgPool())) {
    logDatabaseError(
      "PostgreSQL nicht erreichbar. Terminal 1: npm run db:start (offen lassen) oder npm run db:docker"
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
    if (!(await pingPgPool())) return false;
    try {
      await getPrismaClient().$queryRaw`SELECT 1`;
      if (verboseDb) {
        logDatabaseConnected();
        logDatabaseQuerySuccess("ping-retry");
      }
      return true;
    } catch (retryError) {
      logDatabaseError(retryError);
      await resetPrismaClient();
      return false;
    }
  }
}

const RETRY_DELAY_MS = [300, 600, 1200];

/** Run a Prisma operation with logging and automatic reconnect on connection loss. */
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

