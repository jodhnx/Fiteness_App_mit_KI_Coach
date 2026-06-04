/**
 * Test gamification APIs (requires running dev server + auth cookie optional).
 * Usage: node scripts/test-gamification-api.mjs [baseUrl]
 */
const base = process.argv[2] || "http://localhost:3000";

const routes = [
  { name: "gamification-full", path: "/api/gamification" },
  { name: "gamification-summary", path: "/api/gamification?summary=1" },
  { name: "challenges", path: "/api/challenges" },
];

async function testRoute({ name, path }) {
  const url = `${base}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { _raw: text.slice(0, 200) };
    }
    const ms = Date.now() - started;
    const ok = res.ok;
    console.log(`[${ok ? "OK" : "FAIL"}] ${name} HTTP ${res.status} (${ms}ms)`);
    if (path.includes("gamification") && !path.includes("summary")) {
      console.log("  totalXP:", json.totalXP);
      console.log("  achievements:", Array.isArray(json.achievements) ? json.achievements.length : "?");
      console.log("  challenges:", Array.isArray(json.challenges) ? json.challenges.length : "?");
      if (json._degraded) console.log("  degraded:", json._error);
    }
    if (json.error) console.log("  error:", json.error);
    return { name, ok, status: res.status, ms };
  } catch (e) {
    console.log(`[ERR] ${name}`, e.message);
    return { name, ok: false, error: e.message };
  }
}

console.log("Gamification API test @", base);
const results = [];
for (const r of routes) {
  results.push(await testRoute(r));
}
const failed = results.filter((r) => !r.ok);
console.log("\nSummary:", failed.length ? `${failed.length} failed` : "all reachable");
