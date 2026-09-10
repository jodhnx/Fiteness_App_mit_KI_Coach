/**
 * Validates and normalizes Supabase PostgreSQL connection strings.
 * Ensures postgres.<project-ref> is the USER on pooler hosts, never the HOST.
 *
 * Prisma 7 + @prisma/adapter-pg:
 * - Runtime MUST use Session pooler (:5432) or Direct (:5432).
 * - Transaction pooler (:6543) breaks prepared statements because
 *   `pgbouncer=true` is ignored by the Node pg driver adapter.
 */

export type ParsedDatabaseUrl = {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
  search: string;
  raw: string;
};

export type DatabaseEnvValidation =
  | {
      ok: true;
      databaseUrl: string;
      directUrl: string;
      runtimeUrl: string;
      databaseUrlMasked: string;
      directUrlMasked: string;
      runtimeUrlMasked: string;
      host: string;
      user: string;
      port: string;
      runtimePort: string;
      poolingMode: "session" | "transaction" | "direct" | "local";
    }
  | { ok: false; issues: string[] };

export type SafeDbConnectionMeta = {
  hasDatabaseUrl: boolean;
  hasDirectUrl: boolean;
  databaseHost: string | null;
  databasePort: string | null;
  runtimeHost: string | null;
  runtimePort: string | null;
  poolingMode: string | null;
  poolingEnabled: boolean;
  environment: string | null;
};

const PLACEHOLDER_TOKENS = [
  "YOUR-PASSWORD",
  "DEIN_DB_PASSWORT",
  "PASSWORT_HIER",
  "[PASSWORD]",
  "change-me",
];

/** Mask password in connection string for logs. */
export function maskDatabaseUrl(raw: string): string {
  try {
    const normalized = raw.replace(/^postgresql:/i, "postgres:");
    const url = new URL(normalized);
    if (url.password) url.password = "****";
    return url.toString().replace(/^postgres:/, "postgresql:");
  } catch {
    return raw.replace(/:[^:@/]+@/, ":****@");
  }
}

function isLocalDatabaseUrl(raw: string): boolean {
  return /localhost|127\.0\.0\.1/.test(raw);
}

function allowLocalDatabase(): boolean {
  return process.env.ALLOW_LOCAL_DATABASE === "true" || process.env.NODE_ENV === "test";
}

export function parseDatabaseUrl(raw: string): ParsedDatabaseUrl {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Connection string ist leer.");
  }

  let url: URL;
  try {
    url = new URL(trimmed.replace(/^postgresql:/i, "postgres:"));
  } catch {
    throw new Error(
      `Ungültige Connection URL. Erwartet: postgresql://USER:PASS@HOST:PORT/postgres — erhalten: ${trimmed.slice(0, 40)}…`
    );
  }

  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const host = url.hostname;
  const port = url.port || "5432";
  const database = url.pathname.replace(/^\//, "") || "postgres";

  return {
    user,
    password,
    host,
    port,
    database,
    search: url.search,
    raw: trimmed,
  };
}

function isProjectRefHost(host: string): boolean {
  return /^postgres\.[a-z0-9]+$/i.test(host);
}

function isValidSupabaseHost(host: string): boolean {
  return (
    /\.supabase\.co$/i.test(host) ||
    /\.pooler\.supabase\.com$/i.test(host)
  );
}

function isDirectDbHost(host: string): boolean {
  return /^db\.[a-z0-9]+\.supabase\.co$/i.test(host);
}

function isPoolerHost(host: string): boolean {
  return /\.pooler\.supabase\.com$/i.test(host);
}

type UrlKind = "database" | "direct" | "runtime";

function validateSingleUrl(
  name: string,
  raw: string | undefined,
  options: {
    kind: UrlKind;
    requirePgbouncer?: boolean;
    forbiddenPort?: string;
    requiredPort?: string;
    allowedPorts?: string[];
  }
): string[] {
  const issues: string[] = [];
  if (!raw?.trim()) {
    issues.push(`${name} fehlt in .env`);
    return issues;
  }

  const v = raw.trim();

  if (/localhost|127\.0\.0\.1|:5121[789]\b/.test(v)) {
    issues.push(`${name} zeigt auf localhost — Supabase URL aus dem Dashboard eintragen`);
    return issues;
  }

  if (PLACEHOLDER_TOKENS.some((t) => v.includes(t))) {
    issues.push(`${name} enthält noch Platzhalter — echtes Datenbank-Passwort eintragen`);
  }

  // Unencoded `#` in userinfo truncates the URI (fragment) — password must use %23
  const schemeSep = v.indexOf("://");
  const userinfoEnd = v.indexOf("@", schemeSep + 3);
  if (userinfoEnd > 0) {
    const userinfo = v.slice(schemeSep + 3, userinfoEnd);
    if (userinfo.includes("#")) {
      issues.push(
        `${name}: Passwort enthält unkodiertes „#" — in der URL als %23 encoden, sonst bricht die Connection-URL ab`
      );
    }
  }

  let parsed: ParsedDatabaseUrl;
  try {
    parsed = parseDatabaseUrl(v);
  } catch (e) {
    issues.push(e instanceof Error ? `${name}: ${e.message}` : `${name}: ungültige URL`);
    return issues;
  }

  if (isProjectRefHost(parsed.host)) {
    issues.push(
      `${name}: Host ist „${parsed.host}" — das ist der Supabase-Benutzername, kein Hostname. ` +
        `Korrekt: @aws-XX-REGION.pooler.supabase.com (nicht @postgres.PROJECT_REF).`
    );
  }

  if (!isValidSupabaseHost(parsed.host)) {
    issues.push(
      `${name}: Host „${parsed.host}" ist kein Supabase-Host (.supabase.co / .pooler.supabase.com)`
    );
  }

  // Pooler → postgres.<project-ref>; Direct db.* → postgres
  if (isPoolerHost(parsed.host)) {
    if (!parsed.user.startsWith("postgres.")) {
      issues.push(
        `${name}: Benutzer „${parsed.user}" — bei Supabase Pooler sollte der User postgres.PROJECT_REF sein`
      );
    }
  } else if (isDirectDbHost(parsed.host)) {
    if (parsed.user !== "postgres" && !parsed.user.startsWith("postgres.")) {
      issues.push(
        `${name}: Benutzer „${parsed.user}" — Direct Connection erwartet User „postgres"`
      );
    }
  }

  if (!parsed.password) {
    issues.push(`${name}: Passwort fehlt in der Connection URL`);
  }

  if (options.allowedPorts && !options.allowedPorts.includes(parsed.port)) {
    issues.push(
      `${name}: Port muss ${options.allowedPorts.join(" oder ")} sein (aktuell: ${parsed.port})`
    );
  }

  if (options.requiredPort && parsed.port !== options.requiredPort) {
    issues.push(`${name}: Port muss ${options.requiredPort} sein (aktuell: ${parsed.port})`);
  }

  if (options.forbiddenPort && parsed.port === options.forbiddenPort) {
    issues.push(`${name}: Port ${options.forbiddenPort} ist hier nicht erlaubt`);
  }

  if (options.requirePgbouncer && parsed.port === "6543" && !/[?&]pgbouncer=true/i.test(v)) {
    issues.push(`${name}: ?pgbouncer=true fehlt (Transaction Pooler Port 6543)`);
  }

  return issues;
}

type PoolingMode = "session" | "transaction" | "direct" | "local";

function detectPoolingMode(parsed: ParsedDatabaseUrl): PoolingMode {
  if (isLocalDatabaseUrl(parsed.raw)) return "local";
  if (isDirectDbHost(parsed.host)) return "direct";
  if (parsed.port === "6543") return "transaction";
  return "session";
}

/** Rewrite pooler Transaction :6543 → Session :5432 (same host/credentials). */
export function rewriteTransactionPoolerToSession(raw: string): string | null {
  try {
    const parsed = parseDatabaseUrl(raw);
    if (parsed.port !== "6543" || !isPoolerHost(parsed.host)) return null;
    const url = new URL(raw.trim().replace(/^postgresql:/i, "postgres:"));
    url.port = "5432";
    // pgbouncer=true is a Prisma-engine flag; harmless but useless for PrismaPg
    url.searchParams.delete("pgbouncer");
    return url.toString().replace(/^postgres:/, "postgresql:");
  } catch {
    return null;
  }
}

/**
 * Pick the URL PrismaPg should use at runtime.
 * Prefer Session pooler (:5432 on *.pooler.supabase.com) over Direct (db.*).
 * Transaction (:6543) breaks prepared statements with the Node pg adapter
 * (`pgbouncer=true` has no effect there) — rewrite to Session :5432.
 *
 * On Vercel, Direct `db.*.supabase.co` is often IPv6-only / unreachable —
 * never prefer it when a pooler URL can be used instead.
 */
export function resolvePrismaRuntimeUrl(
  databaseUrl: string,
  directUrl: string
): { url: string; mode: PoolingMode } {
  const onVercel = Boolean(process.env.VERCEL);
  const candidates = [directUrl, databaseUrl].filter(Boolean);

  // 1) Explicit Session pooler :5432
  for (const candidate of candidates) {
    try {
      const parsed = parseDatabaseUrl(candidate);
      if (parsed.port === "5432" && isPoolerHost(parsed.host)) {
        return { url: candidate, mode: "session" };
      }
    } catch {
      /* try next */
    }
  }

  // 2) Rewrite Transaction pooler :6543 → Session :5432 (same host/credentials)
  for (const candidate of candidates) {
    const rewritten = rewriteTransactionPoolerToSession(candidate);
    if (rewritten) {
      return { url: rewritten, mode: "session" };
    }
  }

  // 3) Direct db.* — OK locally; skip on Vercel when pooler rewrite already tried
  if (!onVercel) {
    for (const candidate of candidates) {
      try {
        const parsed = parseDatabaseUrl(candidate);
        if (isDirectDbHost(parsed.host) && parsed.port === "5432") {
          return { url: candidate, mode: "direct" };
        }
      } catch {
        /* try next */
      }
    }
  }

  // 4) Any remaining :5432 (including Direct on Vercel as last resort)
  for (const candidate of candidates) {
    try {
      const parsed = parseDatabaseUrl(candidate);
      if (parsed.port === "5432") {
        return { url: candidate, mode: detectPoolingMode(parsed) };
      }
    } catch {
      /* try next */
    }
  }

  const parsed = parseDatabaseUrl(databaseUrl);
  return { url: databaseUrl, mode: detectPoolingMode(parsed) };
}

export function validateSupabaseDatabaseEnv(): DatabaseEnvValidation {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const directUrlRaw = process.env.DIRECT_URL?.trim() ?? "";

  if (allowLocalDatabase() && isLocalDatabaseUrl(databaseUrl)) {
    const parsed = parseDatabaseUrl(databaseUrl);
    const runtime = resolvePrismaRuntimeUrl(databaseUrl, directUrlRaw || databaseUrl);
    return {
      ok: true,
      databaseUrl,
      directUrl: directUrlRaw || databaseUrl,
      runtimeUrl: runtime.url,
      databaseUrlMasked: maskDatabaseUrl(databaseUrl),
      directUrlMasked: maskDatabaseUrl(directUrlRaw || databaseUrl),
      runtimeUrlMasked: maskDatabaseUrl(runtime.url),
      host: parsed.host,
      user: parsed.user,
      port: parsed.port,
      runtimePort: parseDatabaseUrl(runtime.url).port,
      poolingMode: runtime.mode,
    };
  }

  // DATABASE_URL: accept Transaction (6543) or Session (5432) pooler.
  // Do NOT hard-require ?pgbouncer=true for runtime: PrismaPg uses the Node `pg`
  // driver and prefers DIRECT_URL :5432 (or rewrites :6543 → session). The
  // pgbouncer query flag is a Prisma-engine CLI hint — rejecting login solely
  // for a missing flag was the production root cause of DatabaseConnectionError.
  const issues = validateSingleUrl("DATABASE_URL", databaseUrl, {
    kind: "database",
    allowedPorts: ["6543", "5432"],
    requirePgbouncer: false,
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  try {
    const parsedEarly = parseDatabaseUrl(databaseUrl);
    if (
      parsedEarly.port === "6543" &&
      !/[?&]pgbouncer=true/i.test(databaseUrl)
    ) {
      console.warn(
        "[db] DATABASE_URL :6543 without ?pgbouncer=true — OK for PrismaPg runtime " +
          "(uses DIRECT_URL / session rewrite). Add the flag for Prisma CLI/migrate."
      );
    }
  } catch {
    /* already validated */
  }

  let directUrl = directUrlRaw;
  if (directUrlRaw) {
    const directIssues = validateSingleUrl("DIRECT_URL", directUrlRaw, {
      kind: "direct",
      forbiddenPort: "6543",
      allowedPorts: ["5432"],
    });
    if (directIssues.length > 0) {
      if (process.env.NODE_ENV !== "production" || process.env.DEBUG_DB === "1") {
        console.warn(
          "[db] DIRECT_URL invalid — ignored for runtime:",
          directIssues.join("; ")
        );
      }
      directUrl = databaseUrl;
    }
  } else {
    directUrl = databaseUrl;
  }

  const parsed = parseDatabaseUrl(databaseUrl);
  const runtime = resolvePrismaRuntimeUrl(databaseUrl, directUrl);
  const runtimeParsed = parseDatabaseUrl(runtime.url);

  if (runtime.mode === "transaction") {
    console.warn(
      "[db] Runtime uses Transaction pooler (:6543). PrismaPg may fail with prepared statements — set DIRECT_URL to Session pooler :5432."
    );
  }

  return {
    ok: true,
    databaseUrl,
    directUrl,
    runtimeUrl: runtime.url,
    databaseUrlMasked: maskDatabaseUrl(databaseUrl),
    directUrlMasked: maskDatabaseUrl(directUrl),
    runtimeUrlMasked: maskDatabaseUrl(runtime.url),
    host: parsed.host,
    user: parsed.user,
    port: parsed.port,
    runtimePort: runtimeParsed.port,
    poolingMode: runtime.mode,
  };
}

/** Runtime connection string for Prisma Client (PrismaPg adapter). */
export function getRuntimeDatabaseUrl(): string {
  const validation = validateSupabaseDatabaseEnv();
  if (!validation.ok) {
    throw new Error(validation.issues.join(" "));
  }
  return validation.runtimeUrl;
}

/** Safe connection metadata for logs / health — never includes secrets. */
export function getSafeDbConnectionMeta(): SafeDbConnectionMeta {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasDirectUrl = Boolean(process.env.DIRECT_URL?.trim());
  const validation = validateSupabaseDatabaseEnv();
  if (!validation.ok) {
    return {
      hasDatabaseUrl,
      hasDirectUrl,
      databaseHost: null,
      databasePort: null,
      runtimeHost: null,
      runtimePort: null,
      poolingMode: null,
      poolingEnabled: false,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    };
  }
  let runtimeHost: string | null = null;
  try {
    runtimeHost = parseDatabaseUrl(validation.runtimeUrl).host;
  } catch {
    runtimeHost = validation.host;
  }
  return {
    hasDatabaseUrl,
    hasDirectUrl,
    databaseHost: validation.host,
    databasePort: validation.port,
    runtimeHost,
    runtimePort: validation.runtimePort,
    poolingMode: validation.poolingMode,
    poolingEnabled: validation.poolingMode === "session" || validation.poolingMode === "transaction",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
  };
}

/**
 * True when Error came from our env/URL validation helpers.
 * Keep narrow — do not treat arbitrary Prisma/pg messages as config errors.
 */
export function isDatabaseConfigError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    /^DATABASE_URL\b/m.test(msg) ||
    /DATABASE_URL fehlt/i.test(msg) ||
    /DATABASE_URL enthält noch Platzhalter/i.test(msg) ||
    /DATABASE_URL: /i.test(msg) ||
    /DATABASE_URL zeigt auf localhost/i.test(msg) ||
    /pgbouncer=true fehlt/i.test(msg) ||
    (/Port muss/i.test(msg) && /DATABASE_URL/i.test(msg))
  );
}

/** CLI / migrations connection string (direct/session). */
export function getDirectDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const direct = process.env.DIRECT_URL?.trim();

  if (allowLocalDatabase() && isLocalDatabaseUrl(databaseUrl)) {
    return direct || databaseUrl;
  }

  if (!direct) {
    throw new Error("DIRECT_URL fehlt. Supabase Dashboard → Session pooler (5432).");
  }
  const issues = validateSingleUrl("DIRECT_URL", direct, {
    kind: "direct",
    forbiddenPort: "6543",
    allowedPorts: ["5432"],
  });
  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }
  return direct;
}

/** Collect error message including nested .cause chain. */
export function flattenErrorMessage(error: unknown): string {
  const parts: string[] = [];
  let cur: unknown = error;
  let depth = 0;
  while (cur instanceof Error && depth < 6) {
    if (cur.message) parts.push(cur.message);
    cur = cur.cause;
    depth++;
  }
  if (parts.length === 0 && cur != null) parts.push(String(cur));
  return parts.join(" | ");
}

/** Supabase pooler: project ref unknown / project deleted or paused. */
export function explainSupabasePoolerError(message: string): string | null {
  const tenantMatch = message.match(/tenant\/user\s+(postgres\.[a-z0-9]+)\s+not found/i);
  if (tenantMatch) {
    const ref = tenantMatch[1].replace(/^postgres\./, "");
    return (
      `Supabase-Projekt „${ref}" existiert nicht oder ist pausiert/gelöscht. ` +
      `Das Pooler-Backend kennt diesen Tenant nicht. ` +
      `Neues Projekt im Supabase Dashboard anlegen und DATABASE_URL + DIRECT_URL aus „Connect" kopieren.`
    );
  }
  if (/prepared statement/i.test(message)) {
    return (
      "Prepared-Statement-Fehler — Transaction Pooler (:6543) ist inkompatibel mit PrismaPg. " +
      "DIRECT_URL auf Session Pooler (:5432) setzen; Runtime nutzt dann automatisch :5432."
    );
  }
  if (/password authentication failed|Authentication failed against the database/i.test(message)) {
    return (
      "Datenbank-Authentifizierung fehlgeschlagen — Passwort in DATABASE_URL/DIRECT_URL prüfen " +
      "(Sonderzeichen wie # müssen URL-encoded sein, z.B. %23). Passwort im Supabase Dashboard zurücksetzen und URLs aktualisieren."
    );
  }
  if (/ENOTFOUND\s+db\.[a-z0-9]+\.supabase\.co/i.test(message)) {
    return "Supabase-Datenbank-Host existiert nicht — Projekt-Referenz in .env ist falsch oder Projekt wurde gelöscht.";
  }
  return null;
}
