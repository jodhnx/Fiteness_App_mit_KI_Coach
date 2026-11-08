/**
 * Coach chats API helpers (ownership + titles).
 * Run: npx tsx scripts/test-coach-chats.ts
 */
import {
  titleFromFirstMessage,
} from "../src/lib/coach-chats";
import { relativeChatTime } from "../src/lib/coach-chat-store";

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

console.log("Coach Chats Tests\n");

assert(
  "short title kept",
  titleFromFirstMessage("Proteinbedarf") === "Proteinbedarf"
);
assert(
  "long title truncated",
  titleFromFirstMessage("a".repeat(60)).endsWith("…") &&
    titleFromFirstMessage("a".repeat(60)).length === 46
);
assert("empty → Neuer Chat", titleFromFirstMessage("   ") === "Neuer Chat");

const now = Date.now();
assert(
  "relative just now",
  relativeChatTime(new Date(now - 10_000).toISOString(), now) === "gerade eben"
);
assert(
  "relative minutes",
  relativeChatTime(new Date(now - 5 * 60_000).toISOString(), now).includes(
    "Min"
  )
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
