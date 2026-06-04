/** Structured auth logs — only when DEBUG_AUTH=1 (client + verbose dev) */
export const AuthLog = {
  LOGIN_ATTEMPT: "LOGIN ATTEMPT",
  USER_FOUND: "USER FOUND",
  USER_NOT_FOUND: "USER NOT FOUND",
  PASSWORD_VALID: "PASSWORD VALID",
  PASSWORD_INVALID: "PASSWORD INVALID",
  EMAIL_NOT_VERIFIED: "EMAIL NOT VERIFIED",
  SESSION_CREATED: "SESSION CREATED",
  REDIRECT_SUCCESS: "REDIRECT SUCCESS",
  AUTH_ERROR: "AUTH ERROR",
  RATE_LIMITED: "RATE LIMITED",
  DB_UNAVAILABLE: "DB UNAVAILABLE",
  PARSE_FAILED: "PARSE FAILED",
  DB_QUERY_OK: "DB QUERY OK",
} as const;

const debugEnabled = () =>
  process.env.DEBUG_AUTH === "1" || process.env.AUTH_DEBUG === "1";

/** Always written to server logs (Vercel, Node). Use for authorize + redirects. */
export function logAuthServer(
  phase: string,
  detail?: Record<string, unknown>
) {
  const line = {
    tag: "[auth]",
    phase,
    at: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    ...detail,
  };
  console.error(JSON.stringify(line));
}

export function logAuthEnvOnce() {
  const g = globalThis as { __authEnvLogged?: boolean };
  if (g.__authEnvLogged) return;
  g.__authEnvLogged = true;
  logAuthServer("env_check", {
    hasAuthSecret: Boolean(
      process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
    ),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    authUrl: process.env.AUTH_URL?.trim() || null,
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || null,
    vercelProductionHost: process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || null,
    vercelUrl: process.env.VERCEL_URL?.trim() || null,
    trustHost: true,
  });
}

export function logAuth(
  tag: (typeof AuthLog)[keyof typeof AuthLog],
  detail?: Record<string, unknown> | string
) {
  if (!debugEnabled()) return;
  if (detail === undefined) {
    console.log(tag);
    return;
  }
  if (typeof detail === "string") {
    console.log(tag, detail);
    return;
  }
  console.log(tag, detail);
}
