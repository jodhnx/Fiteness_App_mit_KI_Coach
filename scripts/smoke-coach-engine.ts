/**
 * Smoke test for local coach engine — no API keys, no network.
 * Run: npx tsx scripts/smoke-coach-engine.ts
 */
import { generateLocalCoachReply } from "../src/lib/coach-engine";

const context = `
[Profil] Alter: 28 | Größe: 180 cm | Gewicht: 82 kg
Trainingsziel: Muskelaufbau | Ernährungsziel: BULK
Kalorienziel: 2800 | Proteinziel: 160 g
Protein: 90 / 160 g | konsumiert bisher 2100 kcal | Kalorien übrig: 700
Gewicht-Trend: stagnierend (14 Tage)
Training heute: Upper Body · 45 min
Trainingstage: 4 Tage/Woche | Erfahrung: Intermediate
`;

const cases: { q: string; expect: RegExp }[] = [
  {
    q: "Wie viel Protein brauche ich?",
    expect: /protein|g\/Tag|160/i,
  },
  {
    q: "Warum nehme ich nicht mehr zu?",
    expect: /kalorien|überschuss|stagn|aufbau|150|250/i,
  },
  {
    q: "Analysiere meinen Trainingsplan",
    expect: /upper\/lower|volumen|frequenz|sätze/i,
  },
  {
    q: "Wie ist mein Fortschritt?",
    expect: /fortschritt|trend|stagnierend/i,
  },
  {
    q: "Was ist progressive Overload und RIR?",
    expect: /overload|rir|volumen|spannung/i,
  },
];

let failed = 0;
for (const c of cases) {
  const r = generateLocalCoachReply({
    message: c.q,
    contextText: context,
    history: [{ role: "user", content: "Ich möchte Muskeln aufbauen." }],
  });
  const ok = c.expect.test(r.message);
  console.log(ok ? "OK " : "FAIL", c.q, "→", r.intent.topics.slice(0, 3).join(","));
  if (!ok) {
    failed++;
    console.log("---\n", r.message.slice(0, 400), "\n---");
  }
}

// Follow-up: calories after hypertrophy context
const follow = generateLocalCoachReply({
  message: "Wie viele Kalorien?",
  contextText: context,
  history: [
    { role: "user", content: "Ich möchte Muskeln aufbauen." },
    {
      role: "assistant",
      content: "Für Hypertrophie brauchst du Progressiven Overload und genug Protein.",
    },
  ],
});
const followOk =
  /2800|kalorien|überschuss|aufbau/i.test(follow.message) ||
  follow.intent.topics.includes("calories") ||
  follow.intent.topics.includes("hypertrophy");
console.log(followOk ? "OK " : "FAIL", "Follow-up Kalorien", follow.intent.topics.join(","));
if (!followOk) {
  failed++;
  console.log(follow.message.slice(0, 400));
}

if (failed) {
  console.error(`\n${failed} smoke case(s) failed`);
  process.exit(1);
}
console.log("\nAll coach smoke cases passed.");
