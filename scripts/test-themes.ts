/**
 * Theme pack persistence + normalization.
 * Run: npx tsx scripts/test-themes.ts
 */
import {
  APP_THEMES,
  APPEARANCE_PACKS,
  ACCENT_OPTIONS,
  DESIGN_COMBOS,
  DEFAULT_THEME,
  DEFAULT_ACCENT,
  isValidThemeId,
  isAccentId,
  normalizeThemeId,
  parseStoredTheme,
  formatStoredTheme,
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

assert("at least 12 appearance packs", APP_THEMES.length >= 12);
assert("featured packs >= 11", APPEARANCE_PACKS.length >= 11);
assert("16 accent colors", ACCENT_OPTIONS.length === 16);
assert("10 design combos", DESIGN_COMBOS.length === 10);
assert("default is midnight", DEFAULT_THEME === "midnight");
assert("default accent violet", DEFAULT_ACCENT === "violet");
assert(
  "all pack ids unique",
  new Set(APP_THEMES.map((t) => t.id)).size === APP_THEMES.length
);
assert(
  "all accent ids unique",
  new Set(ACCENT_OPTIONS.map((a) => a.id)).size === ACCENT_OPTIONS.length
);

for (const t of APPEARANCE_PACKS) {
  assert(`valid featured id ${t.id}`, isValidThemeId(t.id));
  assert(
    `colorMode for ${t.id}`,
    t.colorMode === "light" || t.colorMode === "dark"
  );
}

for (const a of ACCENT_OPTIONS) {
  assert(`valid accent ${a.id}`, isAccentId(a.id));
}

assert("legacy blue → clean-light", normalizeThemeId("blue") === "clean-light");
assert("legacy turquoise → ocean", normalizeThemeId("turquoise") === "ocean");
assert("unknown → default", normalizeThemeId("neon-banana") === DEFAULT_THEME);
assert(
  "compound theme parses appearance",
  normalizeThemeId("midnight:emerald") === "midnight"
);
assert(
  "compound theme parses accent",
  parseStoredTheme("midnight:emerald").accent === "emerald"
);
assert(
  "format omits default accent",
  formatStoredTheme("midnight", "violet") === "midnight"
);
assert(
  "format keeps non-default accent",
  formatStoredTheme("graphite", "cyan") === "graphite:cyan"
);
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
  "graphite is dark",
  themeDefaultColorMode("graphite") === "dark"
);
assert(
  "oled-black defaults dark",
  themeDefaultColorMode("oled-black") === "dark"
);
assert(
  "arctic defaults light",
  themeDefaultColorMode("arctic") === "light"
);

const required = [
  "premium-dark",
  "deep-dark",
  "midnight",
  "graphite",
  "carbon",
  "oled-black",
  "soft-light",
  "clean-light",
  "premium-light",
  "arctic",
  "minimal",
];
for (const id of required) {
  assert(
    `includes ${id}`,
    APP_THEMES.some((t) => t.id === id)
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
