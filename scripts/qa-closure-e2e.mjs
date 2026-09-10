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
function jarToHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function login(creds) {
  const jar = new Map();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  for (const [k, v] of parseSetCookie(csrfRes.headers)) jar.set(k, v);
  const { csrfToken } = await csrfRes.json();
  const body = new URLSearchParams({
    csrfToken,
    email: creds.email,
    password: creds.password,
    redirect: "false",
    json: "true",
    callbackUrl: `${BASE}/home`,
  });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jarToHeader(jar),
    },
    body,
    redirect: "manual",
  });
  for (const [k, v] of parseSetCookie(loginRes.headers)) jar.set(k, v);
  let loc = loginRes.headers.get("location");
  let hops = 0;
  while (loc && hops < 5) {
    const abs = loc.startsWith("http") ? loc : `${BASE}${loc}`;
    const r = await fetch(abs, {
      headers: { Cookie: jarToHeader(jar) },
      redirect: "manual",
    });
    for (const [k, v] of parseSetCookie(r.headers)) jar.set(k, v);
    loc = r.headers.get("location");
    hops++;
  }
  const session = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: jarToHeader(jar) },
  }).then((r) => r.json());
  return { jar, session };
}
async function get(jar, path) {
  return fetch(`${BASE}${path}`, {
    headers: { Cookie: jarToHeader(jar) },
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
}
async function post(jar, path, payload) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: jarToHeader(jar),
    },
    body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
}
async function patch(jar, path, payload) {
  return fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: jarToHeader(jar),
    },
    body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
}

const now = new Date();
const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const a = await login({
  email: "admin@aifitness.local",
  password: "Admin123!",
});
const b = await login({
  email: "qa.bravo@aifitness.local",
  password: "QaBravo123!",
});

const report = {
  day: ymd,
  aEmail: a.session?.user?.email,
  bEmail: b.session?.user?.email,
};

const before = await get(
  a.jar,
  `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
);
const qe = await post(a.jar, "/api/nutrition/log", {
  mealType: "LUNCH",
  name: "Schnelleintrag",
  quantityG: 100,
  calories: 650,
  proteinG: 40,
  carbsG: 70,
  fatG: 20,
  source: "quick-entry",
  date: ymd,
});
const after = await get(
  a.jar,
  `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
);
const home = await get(a.jar, `/api/home?day=${ymd}&tzOffset=-120`);
const boot = await get(a.jar, `/api/bootstrap?day=${ymd}&tzOffset=-120`);
const lunchItems =
  (after.json?.mealsByType || []).find((m) => m.mealType === "LUNCH")?.items ||
  [];
const qeItem =
  lunchItems.find(
    (i) => i.food?.name === "Schnelleintrag" || i.food?.brand === "Schnelleintrag"
  ) || [...lunchItems].reverse().find((i) => Math.round(i.calories) === 650);

report.quickEntry = {
  status: qe.status,
  created: Boolean(qeItem),
  calories: qeItem ? Math.round(qeItem.calories) : null,
  protein: qeItem ? Math.round(qeItem.proteinG ?? 0) : null,
  meal: "LUNCH",
  consumedDelta:
    (after.json?.consumed?.calories ?? 0) - (before.json?.consumed?.calories ?? 0),
  homeConsumed:
    home.json?.caloriesIntake ?? home.json?.nutrition?.consumed?.calories,
  bootConsumed: boot.json?.nutrition?.consumed?.calories,
  dashConsumed: after.json?.consumed?.calories,
  consistency:
    after.json?.consumed?.calories === boot.json?.nutrition?.consumed?.calories &&
    after.json?.targets?.calories === boot.json?.nutrition?.targets?.calories,
  itemId: qeItem?.id || null,
};

if (qeItem?.id) {
  const del = await fetch(`${BASE}/api/nutrition/items/${qeItem.id}`, {
    method: "DELETE",
    headers: { Cookie: jarToHeader(a.jar) },
  });
  const afterDel = await get(
    a.jar,
    `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
  );
  report.quickEntry.deleteStatus = del.status;
  report.quickEntry.deleted = !JSON.stringify(afterDel.json).includes(qeItem.id);
}

const catalog = await get(a.jar, "/api/recipes/catalog?limit=8");
const list =
  catalog.json?.recipes ||
  catalog.json?.items ||
  catalog.json?.data ||
  (Array.isArray(catalog.json) ? catalog.json : []);
const recipe = list[0];
report.recipe = {
  catalogStatus: catalog.status,
  recipeId: recipe?.id || null,
  recipeName: recipe?.name || null,
};
if (recipe?.id) {
  const beforeR = await get(
    a.jar,
    `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
  );
  const logR = await post(a.jar, "/api/recipes/log", {
    recipeId: recipe.id,
    mealType: "DINNER",
    date: ymd,
  });
  const afterR = await get(
    a.jar,
    `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
  );
  const homeR = await get(a.jar, `/api/home?day=${ymd}&tzOffset=-120`);
  report.recipe.logStatus = logR.status;
  report.recipe.consumedUp =
    (afterR.json?.consumed?.calories ?? 0) >
    (beforeR.json?.consumed?.calories ?? 0);
  report.recipe.homeMatch =
    (homeR.json?.caloriesIntake ??
      homeR.json?.nutrition?.consumed?.calories) ===
    afterR.json?.consumed?.calories;
  report.recipe.loggedName = logR.json?.recipeName;
}

const prof = await get(a.jar, "/api/profile");
const p = prof.json?.profile || {};
const visible = {
  name: prof.json?.user?.name,
  username: prof.json?.user?.username,
  email: prof.json?.user?.email,
  age: p.age,
  gender: p.gender,
  heightCm: p.heightCm,
  weightKg: p.weightKg,
  targetWeightKg: p.targetWeightKg,
  trainingGoal: p.trainingGoal,
  activityLevel: p.activityLevel,
  workoutDaysPerWeek: p.workoutDaysPerWeek,
  experienceLevel: p.experienceLevel,
  trainingLocation: p.trainingLocation,
  calorieTarget: p.calorieTarget,
  proteinTargetG: p.proteinTargetG,
  carbsTargetG: p.carbsTargetG,
  fatTargetG: p.fatTargetG,
  waterTargetMl: p.waterTargetMl,
};
const patchRes = await patch(a.jar, "/api/profile", {
  age: Number(p.age) || 35,
  heightCm: Number(p.heightCm) || 180,
  weightKg: Number(p.weightKg) || 80,
  targetWeightKg: p.targetWeightKg != null ? Number(p.targetWeightKg) : 78,
  activityLevel: p.activityLevel || "MODERATE",
  trainingGoal: p.trainingGoal || "GENERAL_FITNESS",
  manualCalorieTarget: true,
  calorieTarget: Number(p.calorieTarget) || 2300,
});
const prof2 = await get(a.jar, "/api/profile");
const dash2 = await get(
  a.jar,
  `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
);
const home2 = await get(a.jar, `/api/home?day=${ymd}&tzOffset=-120`);
const boot2 = await get(a.jar, `/api/bootstrap?day=${ymd}&tzOffset=-120`);
report.settings = {
  visible,
  patchStatus: patchRes.status,
  calorieTarget: prof2.json?.profile?.calorieTarget,
  dashTarget: dash2.json?.targets?.calories,
  homeTarget:
    home2.json?.calorieTarget ?? home2.json?.nutrition?.targets?.calories,
  bootTarget: boot2.json?.nutrition?.targets?.calories,
  consistent:
    prof2.json?.profile?.calorieTarget === dash2.json?.targets?.calories &&
    dash2.json?.targets?.calories ===
      (home2.json?.calorieTarget ?? home2.json?.nutrition?.targets?.calories) &&
    dash2.json?.targets?.calories === boot2.json?.nutrition?.targets?.calories,
};

const streakBefore = await get(a.jar, `/api/home?day=${ymd}&tzOffset=-120`);
const s1 = streakBefore.json?.nutritionStreak?.currentDays;
await post(a.jar, "/api/nutrition/log", {
  mealType: "SNACK",
  name: "STREAK_PROBE_1",
  quantityG: 10,
  calories: 11,
  proteinG: 0,
  carbsG: 1,
  fatG: 0,
  source: "quick-entry",
  date: ymd,
});
await post(a.jar, "/api/nutrition/log", {
  mealType: "SNACK",
  name: "STREAK_PROBE_2",
  quantityG: 10,
  calories: 12,
  proteinG: 0,
  carbsG: 1,
  fatG: 0,
  source: "quick-entry",
  date: ymd,
});
const streakAfter = await get(a.jar, `/api/home?day=${ymd}&tzOffset=-120`);
const s2 = streakAfter.json?.nutritionStreak?.currentDays;
report.streak = {
  before: s1,
  after: s2,
  sameDayNoDoubleIncrement: s2 === s1 || (s1 === 0 && s2 === 1),
};

const aId = a.session?.user?.id;
const bDash = await get(
  b.jar,
  `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120&userId=${aId}`
);
await post(b.jar, "/api/nutrition/log", {
  userId: aId,
  mealType: "SNACK",
  name: "OWNERSHIP_CLOSURE",
  quantityG: 10,
  calories: 9,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  source: "quick-entry",
  date: ymd,
});
const aDash = await get(
  a.jar,
  `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
);
const bDash2 = await get(
  b.jar,
  `/api/nutrition/dashboard?day=${ymd}&tzOffset=-120`
);
report.security = {
  bSeesOwnNotA:
    bDash.json?.targets?.calories !== aDash.json?.targets?.calories ||
    bDash.json?.consumed?.calories !== aDash.json?.consumed?.calories,
  aHasProbe: JSON.stringify(aDash.json).includes("OWNERSHIP_CLOSURE"),
  bHasProbe: JSON.stringify(bDash2.json).includes("OWNERSHIP_CLOSURE"),
};

console.log(JSON.stringify(report, null, 2));
