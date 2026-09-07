/**
 * Assert runtime DB validation does not require DIRECT_URL.
 * Run: npx tsx scripts/test-database-url-runtime.ts
 */
import assert from "node:assert/strict";
import {
  validateSupabaseDatabaseEnv,
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
});

withEnv({ DATABASE_URL: sampleDb, DIRECT_URL: sampleDirect }, () => {
  const v = validateSupabaseDatabaseEnv();
  check("runtime ok with both URLs", v.ok === true);
});

withEnv(
  {
    DATABASE_URL: sampleDb,
    DIRECT_URL: sampleDb, // wrong: 6543 forbidden for DIRECT
  },
  () => {
    const v = validateSupabaseDatabaseEnv();
    check("invalid DIRECT_URL still fails when set", v.ok === false);
  }
);

withEnv({ DATABASE_URL: undefined, DIRECT_URL: sampleDirect }, () => {
  const v = validateSupabaseDatabaseEnv();
  check("missing DATABASE_URL fails", v.ok === false);
});

check(
  "isDatabaseConfigError detects DATABASE_URL message",
  isDatabaseConfigError(new Error("DATABASE_URL fehlt in .env"))
);

console.log(`\n${passed} checks passed`);
