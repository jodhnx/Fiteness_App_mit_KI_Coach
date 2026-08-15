/**
 * Curated Unsplash food photos per catalog recipe id.
 * Stable CDN URLs — Next/Image optimizes + caches.
 */

const q = "auto=format&fit=crop&w=800&q=75";

function u(photoPath: string) {
  return `https://images.unsplash.com/${photoPath}?${q}`;
}

/** Map FitnessRecipe.id → food photo URL */
export const RECIPE_IMAGE_BY_ID: Record<string, string> = {
  // Breakfast
  "protein-pancakes": u("photo-1567620905732-2d1ec7ab7445"),
  "protein-oats": u("photo-1517673400267-0251440c45dc"),
  "overnight-oats": u("photo-1484723091739-30a097e8f929"),
  "protein-french-toast": u("photo-1482049016688-2d3e1b311543"),
  "omelett-breakfast": u("photo-1525351484163-7529414344d8"),
  "egg-wrap": u("photo-1626700051175-6818013e1d4f"),
  "yogurt-bowl": u("photo-1488477181946-6428a0291777"),
  "smoothie-bowl": u("photo-1590301157890-4810ed352733"),
  "protein-porridge": u("photo-1571197119809-5ac9e1bb6f6b"),
  "eggs-toast": u("photo-1525351484163-7529414344d8"),
  "cottage-cheese-bowl": u("photo-1626074353765-517a681e40be"),
  "chia-pudding": u("photo-1490474418585-ba9bad8fd0ea"),

  // Lunch
  "chicken-rice": u("photo-1604908176997-125f25cc6f3d"),
  "chicken-teriyaki": u("photo-1598515214211-89d3c73ae83b"),
  "chicken-wrap": u("photo-1626700051175-6818013e1d4f"),
  "chicken-curry": u("photo-1585937421612-70a008356fbe"),
  "chicken-pasta": u("photo-1621996346565-e3dbc646d9a9"),
  "burrito-bowl": u("photo-1626700051175-6818013e1d4f"),
  "beef-rice": u("photo-1546833999-b9f581a1996d"),
  "beef-wrap": u("photo-1565299585323-38d6b0865b47"),
  "turkey-bowl": u("photo-1546069901-ba9599a7e63c"),
  "tuna-rice": u("photo-1579584425555-c3ce17fd4351"),
  "salmon-potato": u("photo-1467003909585-2f8a72700288"),
  "tofu-bowl": u("photo-1512621776951-a57141f2eefd"),

  // Dinner
  "high-protein-pizza": u("photo-1565299624946-b28f40a0ae38"),
  "chicken-bowl-dinner": u("photo-1604908176997-125f25cc6f3d"),
  "steak-potatoes": u("photo-1600891964092-4316c288032e"),
  "chicken-pasta-dinner": u("photo-1621996346565-e3dbc646d9a9"),
  "omelette-dinner": u("photo-1525351484163-7529414344d8"),
  "high-protein-burger": u("photo-1568901346375-23c9450c58cd"),
  "protein-salad": u("photo-1512621776951-a57141f2eefd"),
  "turkey-wrap-dinner": u("photo-1626700051175-6818013e1d4f"),
  "potatoes-chicken": u("photo-1598515214211-89d3c73ae83b"),
  "shrimp-veggie": u("photo-1559339352-11d035aa65de"),
  "veggie-chili": u("photo-1455619452474-d2be8b1e70cd"),

  // Snacks
  "protein-mug-cake": u("photo-1578985545062-69928b1d9587"),
  "protein-cookies": u("photo-1499636136210-6f4ee915583e"),
  "protein-balls": u("photo-1606313564200-e75d5e30476c"),
  "greek-yogurt-bowl": u("photo-1488477181946-6428a0291777"),
  "protein-shake": u("photo-1577803645773-f96470509666"),
  "protein-pudding": u("photo-1488477181946-6428a0291777"),
  "fruit-yogurt": u("photo-1488477181946-6428a0291777"),
  "protein-smoothie-snack": u("photo-1505252585461-04db1eb85825"),
  "rice-cakes-skyr": u("photo-1606312619070-d48b4cbc6b04"),
  "edamame-snack": u("photo-1582515073490-39981397c445"),
  "mini-pancakes-snack": u("photo-1567620905732-2d1ec7ab7445"),
  "cottage-snack": u("photo-1626074353765-517a681e40be"),

  // Extra
  "avocado-toast-egg": u("photo-1525351484163-7529414344d8"),
  "bircher-muesli": u("photo-1517673400267-0251440c45dc"),
  "shakshuka-light": u("photo-1590412203988-a76024f22763"),
  "chicken-quinoa": u("photo-1546069901-ba9599a7e63c"),
  "poke-bowl-light": u("photo-1546069901-ba9599a7e63c"),
  "lentil-dal": u("photo-1546833999-b9f581a1996d"),
  "cod-veggie": u("photo-1519708227418-c8fd9a32b7a2"),
  "zucchini-lasagna": u("photo-1574894709920-11b28e7367e3"),
  "miso-soup-tofu": u("photo-1547592166-23ac45744acd"),
  "protein-ice-cream": u("photo-1563805042-7684c019e1cb"),
  "tuna-cucumber": u("photo-1579584425555-c3ce17fd4351"),
  "hummus-veggie": u("photo-1571066811602-716837d681de"),
};

export function resolveRecipeImageUrl(
  id: string,
  fallback?: string | null
): string | null {
  return fallback || RECIPE_IMAGE_BY_ID[id] || null;
}
