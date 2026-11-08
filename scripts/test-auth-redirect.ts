/**
 * Auth redirect: logout must keep /login (not rewrite to /home).
 * Run: npx tsx scripts/test-auth-redirect.ts
 */
import { safeAuthRedirect, DEFAULT_POST_LOGIN } from "../src/lib/auth-redirect";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

console.log("Auth Redirect Tests\n");

const base = "https://nexform.example";

assert(
  "logout callback keeps /login",
  safeAuthRedirect({ url: `${base}/login`, baseUrl: base }) ===
    `${base}/login`
);
assert(
  "register allowed",
  safeAuthRedirect({ url: `${base}/register`, baseUrl: base }).endsWith(
    "/register"
  )
);
assert(
  "post-login still /home",
  safeAuthRedirect({ url: `${base}/somewhere`, baseUrl: base }) ===
    `${base}${DEFAULT_POST_LOGIN}`
);
assert(
  "relative login path allowed via base",
  safeAuthRedirect({ url: "/login", baseUrl: base }) === `${base}/login`
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
