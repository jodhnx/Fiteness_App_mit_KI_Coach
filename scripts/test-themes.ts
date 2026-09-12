/**
 * Theme pack persistence + normalization.
 * Run: npx tsx scripts/test-themes.ts
 */
import {
  APP_THEMES,
  DEFAULT_THEME,
  isValidThemeId,
  normalizeThemeId,
  themeDefaultColorMode,
} from "../src/lib/themes";

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

console.log("Theme Pack Tests\n");

assert("exactly 12 appearance packs", APP_THEMES.length === 12);
assert("default is clean-light", DEFAULT_THEME === "clean-light");
assert(
  "all pack ids unique",
  new Set(APP_THEMES.map((t) => t.id)).size === APP_THEMES.length
);

for (const t of APP_THEMES) {
  assert(`valid id ${t.id}`, isValidThemeId(t.id));
  assert(
    `colorMode for ${t.id}`,
    t.colorMode === "light" || t.colorMode === "dark"
  );
}

assert("legacy blue → clean-light", normalizeThemeId("blue") === "clean-light");
assert("legacy turquoise → ocean", normalizeThemeId("ocean") === "ocean");
assert(
  "legacy turquoise maps",
  normalizeThemeId("turquoise") === "ocean"
);
assert("unknown → default", normalizeThemeId("neon-banana") === DEFAULT_THEME);
assert(
  "dark pack defaults dark mode",
  themeDefaultColorMode("dark") === "dark"
);
assert(
  "midnight defaults dark",
  themeDefaultColorMode("midnight") === "dark"
);
assert(
  "clean-light defaults light",
  themeDefaultColorMode("clean-light") === "light"
);
assert(
  "high-contrast defaults light",
  themeDefaultColorMode("high-contrast") === "light"
);

const required = [
  "clean-light",
  "pure-white",
  "soft-blue",
  "ocean",
  "graphite",
  "dark",
  "midnight",
  "forest",
  "purple",
  "rose",
  "sand",
  "high-contrast",
];
for (const id of required) {
  assert(
    `includes ${id}`,
    APP_THEMES.some((t) => t.id === id)
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
