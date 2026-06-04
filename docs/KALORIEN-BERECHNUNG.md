# Kalorienziel — Berechnungslogik

Alle Tagesziele laufen zentral über `computeCaloriePlan()` in `src/lib/calorie-target.ts`.
Home, Ernährung, Profil-API und Einstellungen nutzen dieselbe Pipeline (`nutritionTargetsFromProfile` / `computeProfileTargets`).

## 1. BMR (Mifflin-St Jeor)

**Männer:** `10 × kg + 6.25 × cm − 5 × Alter + 5`  
**Frauen:** `10 × kg + 6.25 × cm − 5 × Alter − 161`

## 2. TDEE

`TDEE = BMR × Aktivitätsfaktor`

| Stufe        | Faktor |
|-------------|--------|
| Sitzend     | 1.20   |
| Leicht aktiv| 1.375  |
| Moderat aktiv | 1.55 |
| Hoch aktiv  | 1.725  |
| Sehr aktiv  | 1.90   |

## 3. Zusatzfaktoren (prozentual auf TDEE)

- **Training/Woche:** 0–1× +0 % · 2–3× +3 % · 4–5× +6 % · 6–7× +9 %
- **Schritte (Ø 7 Tage):** ≥8k +0,8 % · ≥10k +1,5 % · ≥12k +3 % · ≥15k +5 %
- **Cardio (aktive Min./Tag, Ø 7 Tage):** ≥25 +2 % · ≥45 +4 % · ≥75 +6 %

`adjustedTdee = TDEE × (1 + Summe der Boni)`

## 4. Ernährungsziel (% auf adjustedTdee)

| Ziel           | Anpassung      |
|----------------|----------------|
| Fettverlust    | −10 % bis −25 % (Standard −17,5 %) |
| Erhaltung      | 0 %            |
| Lean Bulk      | +5 % bis +10 % |
| Muskelaufbau   | +10 % bis +20 % (Kraft/Aufbau → +20 %) |
| Recomp         | −5 % bis +5 % (Standard 0 %) |

`goalCalories = adjustedTdee × (1 + goalPct)`

## 5. Zielgewicht bis Datum

`Tagesdelta = (Zielkg − Aktuellkg) × 7700 / Tage`  
`dateCalories = adjustedTdee + Tagesdelta`

Zusammenführung:

- **Cut / Abnehmen:** `min(goalCalories, dateCalories)`
- **Bulk / Zunehmen:** `max(goalCalories, dateCalories)`
- **Sonst:** Mittelwert

Clamp: **1200–6000 kcal**. Kein Fallback auf 2000 kcal.

---

## Beispielrechnungen (Systemausgabe)

Werte aus `exampleCaloriePlans()` (`npx tsx` / Build):

### Bulk — 82 kg, 182 cm, 28 J., M., sehr aktiv, 5× Training, Muskelaufbau

| Stufe | kcal |
|--------|------|
| BMR | 1823 |
| TDEE (×1,9) | 3464 |
| adjustedTdee (+6 % Training) | 3672 |
| **Ziel (+20 % Aufbau)** | **4406** |

### Maintenance — 78 kg, moderat, 3× Training

| Stufe | kcal |
|--------|------|
| BMR | 1783 |
| TDEE | 2764 |
| **Ziel** | **2847** |

### Cut — 85 kg, 180 cm, 30 J., moderat, 4× Training, Fettabbau

| Stufe | kcal |
|--------|------|
| BMR | 1830 |
| TDEE | 2837 |
| adjustedTdee (+6 % Training) | 3007 |
| **Ziel (−25 % Cut)** | **2255** |

### Referenz: 80 kg Bulk, „hoch aktiv“, 4× Kraft

Profil: 80 kg, 180 cm, 27 J., M., `ACTIVE` (1,725), 4 Trainingstage, `MUSCLE_GAIN` → ca. **3900–4100 kcal** (je nach Schritten/Cardio aus Health-Daten).

---

## Einstellungen speichern (Bugfix)

- `save()` nutzt `try/finally` — `Speichern…` endet immer
- `fetchJson` mit 25s Timeout und klaren Fehlermeldungen
- Nach Erfolg: **kein** `invalidateAllNutritionCaches()` mehr (hat Caches direkt nach dem Speichern geleert)
- Optimistic Update über `publishNutritionDashboard` für Home/Ernährung
- API: `dbQuery` + Logging (`DEBUG_PROFILE=1` oder Development)

## Performance / UI

- Einstellungen: Live-Vorschau ohne API (`previewTargetsFromForm`)
- Bei vorhandenem Ernährungs-Cache: sofortige Aktualisierung von Home-Makros (`publishNutritionDashboard`)
- Nach Speichern: Profil-PATCH + Cache-Invalidierung + `revalidateTag(home-{userId})`
- Keine fest codierten 2000-kcal-Platzhalter in Home/Nutrition-Defaults

## API

```ts
import { computeCaloriePlan, exampleCaloriePlans } from "@/lib/calorie-target";
```
