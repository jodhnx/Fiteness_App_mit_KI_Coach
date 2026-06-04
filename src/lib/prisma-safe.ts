import { prisma } from "@/lib/prisma";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

export async function safePrisma<T>(
  fn: () => Promise<T>,
  fallback: T,
  options?: { logLabel?: string }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      if (process.env.NODE_ENV === "development" && options?.logLabel) {
        console.warn(`[prisma-safe] ${options.logLabel}: schema mismatch, using fallback`);
      }
      return fallback;
    }
    throw error;
  }
}

const tableExistsCache = new Map<string, boolean>();

export async function tableExists(tableName: string): Promise<boolean> {
  const cached = tableExistsCache.get(tableName);
  if (cached !== undefined) return cached;

  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) AS "exists"
    `;
    const exists = Boolean(rows[0]?.exists);
    tableExistsCache.set(tableName, exists);
    return exists;
  } catch {
    tableExistsCache.set(tableName, false);
    return false;
  }
}

export function clearTableExistsCache() {
  tableExistsCache.clear();
}
