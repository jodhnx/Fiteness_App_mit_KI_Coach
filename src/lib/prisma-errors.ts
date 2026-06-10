import { Prisma } from "@prisma/client";

/** Prisma P2021 — table does not exist (strict, no regex). */
export function isMissingTableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
  );
}

/** Prisma P2022 — column does not exist (strict, no regex). */
export function isMissingColumnError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022"
  );
}

/** @deprecated Prefer formatApiErrorMessage — only true Prisma P2021/P2022 codes. */
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
