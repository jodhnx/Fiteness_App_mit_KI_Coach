/**
 * Assert runtime DB URL resolution for PrismaPg.
 * Runtime must prefer Session/Direct :5432 over Transaction :6543.
 * Run: npx tsx scripts/test-database-url-runtime.ts
 */
import {
  validateSupabaseDatabaseEnv,
  resolvePrismaRuntimeUrl,
  isDatabaseConfigError,
} from "../src/lib/database-url";

const sampleDb =
  "postgresql://postgres.abc123ref:Secret%23123@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
const sampleDirect =
  "postgresql://postgres.abc123ref:Secret%23123@aws-1-eu-west-2.pooler.supabase.com:5432/postgres";

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    const v = vars[key];
    if (v === undefined) delete process.env[key];
    else process.env[key] = v;
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
}

let passed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error("✗", name);
    process.exitCode = 1;
    return;
  }
  console.log("✓", name);
  passed++;
}

withEnv({ DATABASE_URL: sampleDb, DIRECT_URL: undefined }, () => {
  const v = validateSupabaseDatabaseEnv();
  check("runtime ok without DIRECT_URL", v.ok === true);
  if (v.ok) {
    check(
      "without DIRECT rewrites :6543 → :5432 session",
      v.runtimePort === "5432" && v.poolingMode === "session"
    );
    check(
      "rewritten URL keeps pooler host",
      /pooler\.supabase\.com/.test(v.runtimeUrl) && !/:6543\b/.test(v.runtimeUrl)
    );
  }
});

withEnv({ DATABASE_URL: sampleDb, DIRECT_URL: sampleDirect }, () => {
  const v = validateSupabaseDatabaseEnv();
  check("runtime ok with both URLs", v.ok === true);
  if (v.ok) {
    check("runtime prefers DIRECT_URL :5432", v.runtimeUrl === sampleDirect);
    check("runtimePort is 5432", v.runtimePort === "5432");
    check("poolingMode is session", v.poolingMode === "session");
  }
});

withEnv(
  {
    DATABASE_URL: sampleDb,
    DIRECT_URL: sampleDb, // wrong: 6543 on DIRECT — must NOT block runtime
  },
  () => {
    const v = validateSupabaseDatabaseEnv();
    check("invalid DIRECT_URL ignored for runtime", v.ok === true);
    if (v.ok) {
      check("falls back to DATABASE_URL as direct", v.directUrl === sampleDb);
    }
  }
);

withEnv({ DATABASE_URL: undefined, DIRECT_URL: sampleDirect }, () => {
  const v = validateSupabaseDatabaseEnv();
  check("missing DATABASE_URL fails", v.ok === false);
});

{
  const resolved = resolvePrismaRuntimeUrl(sampleDb, sampleDirect);
  check("resolvePrismaRuntimeUrl picks session URL", resolved.url === sampleDirect);
  check("resolvePrismaRuntimeUrl mode session", resolved.mode === "session");
}

check(
  "isDatabaseConfigError detects DATABASE_URL fehlt",
  isDatabaseConfigError(new Error("DATABASE_URL fehlt in .env"))
);

check(
  "isDatabaseConfigError ignores generic connection string noise",
  !isDatabaseConfigError(new Error("Invalid connection string from driver"))
);

console.log(`\n${passed} checks passed`);
