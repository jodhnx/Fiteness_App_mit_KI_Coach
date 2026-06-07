# Ernährung & Lebensmitteltracking — Premium Update

**Datum:** Juni 2026  
**Build:** `npm run build` ✓ erfolgreich

---

## 1. Schnellere Lebensmittelsuche

| Optimierung | Details |
|-------------|---------|
| **Debounce 80ms** | Statt 120–200ms |
| **Zwei-Phasen-Suche** | Zuerst `localOnly=1` (DB + Standardgerichte), danach OFF-Merge |
| **Client-Cache 5 Min** | `food-search:{query}` TTL 300s |
| **Server-Cache 2 Min** | `nutrition-search-service` TTL 120s |
| **Vorladen** | Banane, Haferflocken, Pizza, Hähnchen beim App-Start |
| **AbortController** | Abgebrochene Requests bei neuem Tastendruck |

---

## 2. Datenquellen (DE / AT / CH)

| Quelle | Priorität |
|--------|-----------|
| **Lokale DB** (`FoodItem`, Seed-Katalog) | Höchste |
| **Standardgerichte** (`standard-dishes.ts`) | Sehr hoch |
| **Open Food Facts** | Ergänzend, gefiltert |

**DACH-Ranking:**
- AT/DE/CH Länder-Tags + Marken (Billa, Spar, Rewe, Edeka, Migros, Coop, Lidl, Aldi, DM, …)
- `de.openfoodfacts.org`, `ch.openfoodfacts.org` als Fallback
- **US-only Produkte werden ausgefiltert** (`filterNonDachProducts`)
- Deutschsprachige Produktnamen bevorzugt (+20 Score)

---

## 3. Standardgerichte (17 Einträge)

Pizza Salami/Margherita/Tonno, Döner, Kebap Teller, Schnitzel, Pommes, Burger, Cheeseburger, Pasta Bolognese, Lasagne, Sushi, Fried Rice, Hähnchen mit Reis, Steak, Gemischter Salat, Caesar Salad

Sofort suchbar — auch ohne DB-Seed.

---

## 4. Intelligente Portionsgrößen

Modul: `src/lib/food/portion-presets.ts`

Beispiele:
- **Pizza:** 1 ganze (350g), 1/2 (175g), 1 Stück (45g), 100g
- **Banane:** 1 Banane (120g), 1/2 (60g), 100g
- **Proteinriegel:** 1 Riegel, 1/2 Riegel, 100g
- **Döner, Burger, Schnitzel, Pasta, Sushi, Salat** — eigene Presets

`getDefaultQuickAddGrams()` für Schnell-Hinzufügen.

---

## 5. Schnell hinzufügen

Jede Suchzeile:
- **★** Favorit (wenn in DB)
- **+** Schnell hinzufügen mit Standardportion
- **›** Details (Bottom Sheet)

Kein Seitenwechsel nötig — Bottom Sheet direkt auf Ernährungsseite (`AddFoodSheet`).

---

## 6. Produktdetails (Bottom Sheet)

`ProductDetailModal` — von unten, ohne Scrollen:
- Kalorien, Protein, Kohlenhydrate, Fett sofort sichtbar
- Portions-Chips (kein manuelles Scrollen)
- Mahlzeit wählen
- Favorit + Hinzufügen

---

## 7. Sofortige Aktualisierung

`optimisticAddMealItem()` + `useFoodQuickAdd()`:
- UI aktualisiert **sofort** (Home, Ernährung, Fortschritt via `publishNutritionDashboard`)
- Server-Reconcile nach `POST /api/nutrition/quick-add`
- Rollback bei Fehler

---

## 8. Performance

- Weniger API-Calls (Cache, localOnly first)
- Optimistic Updates beim Hinzufügen
- Mobile-first Bottom Sheet
- Memo auf Search-Rows & Panels

---

## Geänderte / neue Dateien

### Neu
- `src/data/standard-dishes.ts`
- `src/lib/food/portion-presets.ts`
- `src/hooks/use-food-quick-add.ts`
- `docs/ERNÄHRUNG-PREMIUM-UPDATE.md`

### Kern
- `src/components/nutrition/product-search-panel.tsx`
- `src/components/nutrition/product-detail-modal.tsx`
- `src/components/nutrition/product-search-row.tsx`
- `src/components/nutrition/add-food-sheet.tsx`
- `src/app/(app)/nutrition/page.tsx`
- `src/lib/food/nutrition-search-service.ts`
- `src/lib/food/open-food-facts-client.ts`
- `src/lib/nutrition-sync.ts` (`optimisticAddMealItem`)
- `src/app/api/food/search/route.ts`
- `src/lib/nav-cache-warmer.ts`
