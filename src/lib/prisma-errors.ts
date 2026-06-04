import { Prisma } from "@prisma/client";

/** Prisma P2021 / P2022 / raw PG: relation does not exist */
export function isMissingTableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022") return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return (
    /does not exist/i.test(msg) ||
    /relation.*not found/i.test(msg) ||
    /table.*not found/i.test(msg) ||
    /Unknown table/i.test(msg)
  );
}

export function isMissingColumnError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022") return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /column.*does not exist/i.test(msg) || /unknown column/i.test(msg);
}

export function isSchemaMismatchError(error: unknown): boolean {
  return isMissingTableError(error) || isMissingColumnError(error);
}

/** DB down, wrong host/port, or Prisma cannot connect (e.g. ECONNREFUSED). */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const code = error.code;
    if (
      code === "P1001" ||
      code === "P1000" ||
      code === "P1017" ||
      code === "P2010" ||
      code === "ECONNREFUSED"
    ) {
      return true;
    }
    const driverMsg =
      error.meta && typeof error.meta === "object" && "driverAdapterError" in error.meta
        ? String((error.meta as { driverAdapterError?: { name?: string } }).driverAdapterError?.name ?? "")
        : "";
    if (/ConnectionClosed/i.test(driverMsg)) return true;
  }

  const msg = error instanceof Error ? error.message : String(error);
  return (
    /ECONNREFUSED/i.test(msg) ||
    /ECONNRESET/i.test(msg) ||
    /Can't reach database server/i.test(msg) ||
    /Server has closed the connection/i.test(msg) ||
    /closed the connection/i.test(msg) ||
    /connection.*(refused|terminated|timeout|closed|reset)/i.test(msg) ||
    /connect ENOENT/i.test(msg) ||
    /Client has encountered a connection error/i.test(msg)
  );
}
