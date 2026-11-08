/**
 * Local coach engine (API-key-free).
 * Run: npx tsx scripts/test-coach-engine.ts
 */
import {
  classifyCoachIntent,
  generateLocalCoachReply,
  parseCoachUserFacts,
} from "../src/lib/coach-engine";
import { estimateProteinTarget } from "../src/lib/coach-engine/facts";

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

console.log("Coach Engine Tests\n");

{
  const i = classifyCoachIntent("Wie viel Protein brauche ich?");
  assert("protein → nutrition mode", i.mode === "nutrition");
  assert("protein topic", i.topics.includes("protein"));
  assert("how_much kind", i.kind === "how_much");
}

{
  const i = classifyCoachIntent("Und wenn ich im Cut bin?", {
    history: [
      { role: "user", content: "Wie viel Protein brauche ich?" },
      { role: "assistant", content: "Etwa 160g Protein." },
    ],
  });
  assert("follow-up detected", i.isFollowUp);
  assert("follow-up keeps protein topic", i.topics.includes("protein"));
}

{
  const i = classifyCoachIntent(
    "Soll ich heute weniger essen, weil ich gestern über meinem Ziel war und heute nicht trainiere?"
  );
  assert(
    "multi-topic calories",
    i.topics.includes("calories") ||
      i.topics.includes("today_decision") ||
      i.mode === "nutrition" ||
      i.mode === "training"
  );
}

{
  const i = classifyCoachIntent("Wie verbessere ich meinen Upper/Lower Plan?");
  assert("split → plan mode", i.mode === "plan");
}

{
  const est = estimateProteinTarget(80, "Fettverlust");
  assert("protein estimate exists", !!est);
  assert("protein mid in range", !!est && est.mid >= 140 && est.mid <= 200);
}

{
  const facts = parseCoachUserFacts(
    `[PROFIL]\nGewicht: 82 kg\nErnährungsziel: Muskelaufbau\nKalorienziel: 2800\nProteinziel: 170 g\nProtein übrig: 55 g\nKalorien übrig: 900`
  );
  assert("parses weight", facts.weightKg === 82);
  assert("parses calorie target", facts.calorieTarget === 2800);
  assert("parses protein remaining", facts.proteinRemaining === 55);

  const reply = generateLocalCoachReply({
    message: "Wie viel Protein sollte ich essen?",
    contextText: `[PROFIL]\nGewicht: 82 kg\nErnährungsziel: Muskelaufbau\nProteinziel: 170 g`,
  });
  assert("local reply non-empty", reply.message.length > 80);
  assert("local reply mentions grams or protein", /protein|g\/Tag|g\b/i.test(reply.message));
  assert("source local-engine", reply.source === "local-engine");
  assert("no fake openai key ask", !/OPENAI_API_KEY/.test(reply.message));
}

{
  const reply = generateLocalCoachReply({
    message: "Was soll ich heute essen, wenn mir noch 800 kcal und 60 g Protein fehlen?",
    contextText: `Kalorien übrig: 800\nProtein übrig: 60 g\nKalorienziel: 2400`,
  });
  assert("meal plan reply", /800|Protein|kcal/i.test(reply.message));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
