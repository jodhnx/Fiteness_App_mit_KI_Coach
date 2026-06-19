/**
 * Validates and normalizes Supabase PostgreSQL connection strings.
 * Ensures postgres.<project-ref> is the USER, never the HOST.
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
      databaseUrlMasked: string;
      directUrlMasked: string;
      host: string;
      user: string;
      port: string;
    }
  | { ok: false; issues: string[] };

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

function validateSingleUrl(
  name: string,
  raw: string | undefined,
  options: { requirePgbouncer?: boolean; forbiddenPort?: string; requiredPort?: string }
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

  if (!parsed.user.startsWith("postgres.")) {
    issues.push(
      `${name}: Benutzer „${parsed.user}" — bei Supabase Pooler sollte der User postgres.PROJECT_REF sein`
    );
  }

  if (!parsed.password) {
    issues.push(`${name}: Passwort fehlt in der Connection URL`);
  }

  if (options.requiredPort && parsed.port !== options.requiredPort) {
    issues.push(`${name}: Port muss ${options.requiredPort} sein (aktuell: ${parsed.port})`);
  }

  if (options.forbiddenPort && parsed.port === options.forbiddenPort) {
    issues.push(`${name}: Port ${options.forbiddenPort} ist hier nicht erlaubt`);
  }

  if (options.requirePgbouncer && !/[?&]pgbouncer=true/i.test(v)) {
    issues.push(`${name}: ?pgbouncer=true fehlt (erforderlich für Transaction Pooler Port 6543)`);
  }

  return issues;
}

export function validateSupabaseDatabaseEnv(): DatabaseEnvValidation {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const directUrl = process.env.DIRECT_URL?.trim() ?? "";

  if (allowLocalDatabase() && isLocalDatabaseUrl(databaseUrl)) {
    const parsed = parseDatabaseUrl(databaseUrl);
    return {
      ok: true,
      databaseUrl,
      directUrl: directUrl || databaseUrl,
      databaseUrlMasked: maskDatabaseUrl(databaseUrl),
      directUrlMasked: maskDatabaseUrl(directUrl || databaseUrl),
      host: parsed.host,
      user: parsed.user,
      port: parsed.port,
    };
  }

  const issues: string[] = [
    ...validateSingleUrl("DATABASE_URL", databaseUrl, {
      requirePgbouncer: true,
      requiredPort: "6543",
    }),
    ...validateSingleUrl("DIRECT_URL", directUrl, {
      forbiddenPort: "6543",
    }),
  ];

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const parsed = parseDatabaseUrl(databaseUrl);

  return {
    ok: true,
    databaseUrl,
    directUrl,
    databaseUrlMasked: maskDatabaseUrl(databaseUrl),
    directUrlMasked: maskDatabaseUrl(directUrl),
    host: parsed.host,
    user: parsed.user,
    port: parsed.port,
  };
}

/** Runtime connection string for Prisma Client (pooled). */
export function getRuntimeDatabaseUrl(): string {
  const validation = validateSupabaseDatabaseEnv();
  if (!validation.ok) {
    throw new Error(validation.issues.join(" "));
  }
  return validation.databaseUrl;
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
  const issues = validateSingleUrl("DIRECT_URL", direct, { forbiddenPort: "6543" });
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
      `Neues Projekt im Supabase Dashboard anlegen und DATABASE_URL + DIRECT_URL aus „Connect" kopieren. ` +
      `DNS-Check: db.${ref}.supabase.co muss auflösbar sein.`
    );
  }
  if (/ENOTFOUND\s+db\.[a-z0-9]+\.supabase\.co/i.test(message)) {
    return "Supabase-Datenbank-Host existiert nicht — Projekt-Referenz in .env ist falsch oder Projekt wurde gelöscht.";
  }
  return null;
}
