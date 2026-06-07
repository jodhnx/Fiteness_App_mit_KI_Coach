# Ernährung — Produkte & Gramm-Eingabe Reparatur

**Datum:** Juni 2026

---

## Zusammenfassung

Die Ernährungssuche und das Hinzufügen wurden repariert. Produkte ohne Barcode können wieder gespeichert werden, der Lebensmittel-Katalog ist in der Suche aktiv, und die Detailansicht bietet wieder **Eigene Gramm** mit Live-Makro-Berechnung.

`npm run build` — erfolgreich.

---

## Ursache der Hauptfehler

| Symptom | Ursache |
|---------|---------|
| „Produkt hat keine Barcode-ID" | `ensureFoodItemId` lehnte Standardgerichte/Katalog ohne `offCode` ab |
| Keine Suchergebnisse | `FOOD_CATALOG` (~21.700 Einträge) war nicht in der Suche eingebunden |
| OFF-Fehler sichtbar | `offError` wurde angezeigt, obwohl lokale Treffer vorhanden waren |
| Falsche Kalorien | Standardgerichte hatten `servingG` = Portionsgröße, Werte aber pro 100g |

---

## Datenquellen (Priorität)

```
1. Standardgerichte (27)     — Pizza, Döner, Banane, Whey, Magerquark, …
2. Lebensmittel-Katalog       — 21.768 Basis-Lebensmittel (In-Memory)
3. PostgreSQL FoodItem        — Nutzer-DB + importierte Produkte
4. Open Food Facts (DACH)     — AT → DE → CH → World, DACH-Filter
```

### Verfügbare Lebensmittel

| Quelle | Anzahl | Barcode nötig? |
|--------|--------|----------------|
| Standardgerichte | 27 | Nein |
| Lebensmittel-Katalog | 21.768 | Nein |
| Open Food Facts | dynamisch | Nein (Textsuche) |
| PostgreSQL | dynamisch | Nein |

**Gesamt ohne Barcode:** >21.700 sofort durchsuchbare Lebensmittel mit echten Makrowerten.

---

## Behobene Bugs

### 1. Produkte hinzufügen
- `ensureFoodItemId` importiert jetzt **alle** Produkte über `/api/food/import` (mit oder ohne Barcode)
- Import-API: `offCode` optional für lokale Produkte
- `upsertFoodFromProduct`: korrektes `dataSource: local` ohne OFF-Code

### 2. Suche
- `searchFoodCatalog()` in `nutrition-search-service` integriert
- 10 neue Standardlebensmittel (Banane, Reis, Haferflocken, Whey, Skyr, Ei, …)
- OFF-Fehler werden nicht mehr angezeigt, wenn lokale Treffer existieren
- Nur noch **1 API-Request** pro Suche (statt localOnly + full)

### 3. Gramm-Eingabe
- Detail-Popup: Portionen + Chip **„Eigene Gramm"**
- Freie Eingabe: 1–5000 g (z.B. 50, 80, 125, 200, 350, 500)
- Makros (kcal, Protein, Carbs, Fett) aktualisieren live

### 4. Portionen
- Pizza: Ganze Pizza (350g), Halbe (175g), Stück (45g)
- Skyr/Magerquark/Pudding: Becher-Portionen
- Whey: 30g Portion, Messlöffel, 50g, 100g

### 5. Kalorienberechnung
- Alle Standardgerichte: `servingG: 100` (Werte sind pro 100g)
- `macrosForQuantity(food, grams)` berechnet korrekt: `kcal = calories × (grams / 100)`

### 6. Such-UI
- Zeile: Name + **„290 kcal pro 100g"**
- ⭐ Favorit (wenn in DB) + ➕ Schnell hinzufügen
- Tap auf Name → Detail mit Portionen & eigener Grammzahl

---

## Gramm-Eingabe — Ablauf

```
Produkt antippen
      ↓
Detail-Popup
      ↓
Portion wählen ODER „Eigene Gramm"
      ↓
[125] g eingeben → Makros live aktualisiert
      ↓
„Hinzufügen · 125 g"
```

Schnell-Hinzufügen (➕) nutzt weiterhin die intelligente Standardportion aus `getPortionPresets()`.

---

## Performance

| Maßnahme | Effekt |
|----------|--------|
| 1 Search-Request | 50% weniger API-Calls |
| Katalog In-Memory | Sofortige lokale Treffer |
| Standardgerichte client-seitig | Instant-Ergebnisse während API lädt |
| Search-Cache (Server + Client) | Wiederholte Suchen schneller |
| Optimistic Updates | Home + Ernährung sofort aktualisiert |

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/ensure-food-id.ts` | Import ohne Barcode |
| `src/app/api/food/import/route.ts` | offCode optional |
| `src/lib/food/food-database-service.ts` | dataSource-Fix |
| `src/lib/food/nutrition-search-service.ts` | Katalog + OFF-Fehler-Fix |
| `src/data/food-catalog.ts` | `searchFoodCatalog()` |
| `src/data/standard-dishes.ts` | +10 Lebensmittel, servingG-Fix |
| `src/lib/food/portion-presets.ts` | Skyr, Quark, Whey, Pudding |
| `src/components/nutrition/food-detail-popup.tsx` | Eigene Gramm |
| `src/components/nutrition/food-quick-row.tsx` | kcal/100g + ⭐ |
| `src/components/nutrition/food-add-popup.tsx` | Favoriten, 1 Request |
| `src/app/(app)/nutrition/page.tsx` | Favoriten an Popup |

---

## Test-Checkliste

- [ ] „Pizza Salami" → Treffer mit 290 kcal/100g
- [ ] „Banane", „Magerquark", „Whey Protein" → Treffer
- [ ] ➕ → sofort hinzugefügt (kein Barcode-Fehler)
- [ ] Detail → „Eigene Gramm" → 125g → korrekte kcal
- [ ] Pizza Detail → Ganze Pizza 350g ≈ 1015 kcal
- [ ] Home kcal synchron mit Ernährung
