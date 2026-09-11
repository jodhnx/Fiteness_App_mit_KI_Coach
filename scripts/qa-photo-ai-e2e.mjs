/**
 * Photo AI API smoke/E2E (no fake success).
 * Tests auth, invalid image, optional real OpenAI analysis + log ownership.
 */
const BASE = "http://localhost:3000";

function parseSetCookie(headers) {
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const map = new Map();
  for (const line of raw) {
    const [nv] = line.split(";");
    const i = nv.indexOf("=");
    if (i > 0) map.set(nv.slice(0, i), nv.slice(i + 1));
  }
  return map;
}
function jarH(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function login(email, password) {
  const jar = new Map();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  for (const [k, v] of parseSetCookie(csrfRes.headers)) jar.set(k, v);
  const { csrfToken } = await csrfRes.json();
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jarH(jar),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      redirect: "false",
      json: "true",
      callbackUrl: `${BASE}/home`,
    }),
    redirect: "manual",
  });
  for (const [k, v] of parseSetCookie(loginRes.headers)) jar.set(k, v);
  let loc = loginRes.headers.get("location");
  let hops = 0;
  while (loc && hops < 5) {
    const abs = loc.startsWith("http") ? loc : `${BASE}${loc}`;
    const r = await fetch(abs, { headers: { Cookie: jarH(jar) }, redirect: "manual" });
    for (const [k, v] of parseSetCookie(r.headers)) jar.set(k, v);
    loc = r.headers.get("location");
    hops++;
  }
  const session = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: jarH(jar) },
  }).then((r) => r.json());
  return { jar, session };
}

function tinyPng() {
  // 1x1 PNG
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return Buffer.from(b64, "base64");
}

async function postFoodAi(jar, blob, filename, type) {
  const fd = new FormData();
  fd.append("image", new Blob([blob], { type }), filename);
  const res = await fetch(`${BASE}/api/nutrition/food-ai`, {
    method: "POST",
    headers: { Cookie: jarH(jar) },
    body: fd,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  const report = {};

  // Unauthorized
  const unauth = await fetch(`${BASE}/api/nutrition/food-ai`, { method: "POST", body: new FormData() });
  report.unauthorized = { status: unauth.status, ok: unauth.status === 401 };

  const a = await login("admin@aifitness.local", "Admin123!");
  report.loginA = { email: a.session?.user?.email, id: a.session?.user?.id };

  // Invalid mime via text file
  const bad = await postFoodAi(a.jar, Buffer.from("not an image"), "x.txt", "text/plain");
  report.invalidImage = {
    status: bad.status,
    errorCode: bad.json?.errorCode,
    items: bad.json?.items?.length ?? null,
    ok:
      bad.status === 200 &&
      bad.json?.errorCode === "invalid_image" &&
      Array.isArray(bad.json?.items) &&
      bad.json.items.length === 0,
  };

  // Tiny PNG — may be empty / openai_error / parse — never fake success with invented foods
  const png = await postFoodAi(a.jar, tinyPng(), "dot.png", "image/png");
  const hasFake =
    Array.isArray(png.json?.items) &&
    png.json.items.length > 0 &&
    png.json.items.every((it) => it.name && it.calories >= 0);
  report.realVisionCall = {
    status: png.status,
    errorCode: png.json?.errorCode ?? null,
    itemCount: png.json?.items?.length ?? 0,
    disclaimer: png.json?.disclaimer?.slice(0, 80) ?? null,
    // Success only if foods returned WITHOUT errorCode
    successWithoutErrorCode:
      png.status === 200 &&
      !png.json?.errorCode &&
      (png.json?.items?.length ?? 0) > 0,
    // Acceptable failure paths (no fake)
    honestFailure:
      png.status === 200 &&
      (png.json?.errorCode === "empty" ||
        png.json?.errorCode === "openai_error" ||
        png.json?.errorCode === "timeout" ||
        png.json?.errorCode === "parse_error" ||
        png.json?.errorCode === "missing_key" ||
        png.json?.errorCode === "rate_limit") &&
      (png.json?.items?.length ?? 0) === 0,
    note: hasFake && png.json?.errorCode
      ? "UNEXPECTED: items with errorCode"
      : null,
  };

  // Save path ownership: food-ai log for A, B must not see it as theirs incorrectly
  const day = new Date();
  const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const marker = `PHOTO_AI_E2E_${Date.now()}`;
  const logRes = await fetch(`${BASE}/api/nutrition/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: jarH(a.jar),
    },
    body: JSON.stringify({
      mealType: "SNACK",
      name: marker,
      quantityG: 120,
      calories: 240,
      proteinG: 12,
      carbsG: 20,
      fatG: 8,
      source: "food-ai",
      date: ymd,
    }),
  });
  const logJson = await logRes.json().catch(() => null);
  report.save = {
    status: logRes.status,
    hasDashboard: !!logJson?.dashboard,
    hasStreak: typeof logJson?.nutritionStreak === "number",
    mealsInclude: (logJson?.dashboard?.mealsByType || [])
      .flatMap((m) => (m.items || []).map((i) => i.food?.name || i.name))
      .includes(marker),
  };

  const b = await login("qa.bravo@aifitness.local", "QaBravo123!");
  const dashB = await fetch(
    `${BASE}/api/nutrition/dashboard?day=${ymd}&tzOffset=${day.getTimezoneOffset()}`,
    { headers: { Cookie: jarH(b.jar) } }
  ).then((r) => r.json());
  const bNames = (dashB.mealsByType || []).flatMap((m) =>
    (m.items || []).map((i) => i.food?.name || i.name)
  );
  report.ownership = {
    bHasMarker: bNames.includes(marker),
    ok: !bNames.includes(marker),
  };

  console.log(JSON.stringify(report, null, 2));

  const hardFail =
    !report.unauthorized.ok ||
    !report.invalidImage.ok ||
    !report.ownership.ok ||
    report.save.status < 200 ||
    report.save.status >= 300 ||
    (report.realVisionCall.successWithoutErrorCode === false &&
      report.realVisionCall.honestFailure === false &&
      report.realVisionCall.status === 200 &&
      (report.realVisionCall.itemCount ?? 0) > 0 &&
      report.realVisionCall.errorCode);

  if (hardFail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
