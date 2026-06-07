# Ernährung Mobile UI Update

**Datum:** Juni 2026  
**Ziel:** Mobile-first Premium-Ernährungstracking mit modernen Bottom Sheets (Yazio/MyFitnessPal-Niveau)

---

## Zusammenfassung

Die Ernährungs-UI wurde vollständig für Smartphones überarbeitet. Das fehlerhafte Overlay-System wurde durch portalierte Bottom Sheets ersetzt. Safe Areas, Z-Index-Konflikte und abgeschnittene Inhalte sind behoben. `npm run build` läuft fehlerfrei durch.

---

## Behobene Bugs

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Hinzufügen-Fenster zu weit oben / abgeschnitten | `fixed` innerhalb von `main` / `mobile-app-frame` statt Viewport | `createPortal` → `document.body` |
| Buttons außerhalb des sichtbaren Bereichs | Nested Modal in scrollbarem Panel, falsche `max-height` | Zwei getrennte Sheet-Layer (`base` + `detail`) |
| Header überlappt Inhalte | Z-Index Header `z-30` vs. Modal im DOM-Stack | Sheets mit `z-index: 200/210` auf `body` |
| Bottom-Nav sichtbar unter Sheet | Nav `z-50` im gleichen Stacking-Kontext | Portal über Nav + `body[data-mobileSheet]` blendet Nav aus |
| Scroll-Bugs / Doppel-Scroll | Modal in scrollbarem Parent | Body-Scroll-Lock + `overscroll-behavior: contain` |
| Safe-Area (Notch, Dynamic Island) | Keine `env(safe-area-inset-*)` | Padding auf Root, Panel und Bottom-Nav |
| TypeScript-Fehler Favoriten | `toggleFavorite(FoodProduct)` vs. `(id: string)` | Wrapper in Add-Route und Nutrition-Page |

**Entfernt:** `product-detail-modal.tsx` (ersetzt durch `product-detail-sheet.tsx`)

---

## Architektur: Mobile Bottom Sheets

```
Nutrition Page
  └── AddFoodSheet (state: open/close)
        ├── MobileBottomSheet [layer=base, variant=full]  → Portal body z-200
        │     └── ProductSearchPanel (Suche, Quick-Add, Favoriten)
        └── ProductDetailSheet [layer=detail, variant=compact] → Portal body z-210
              └── Makros, Portionen, Mahlzeit, Hinzufügen-Button
```

### Neue / zentrale Dateien

- `src/components/ui/mobile-bottom-sheet.tsx` — Wiederverwendbares Portal-Sheet
- `src/components/nutrition/product-detail-sheet.tsx` — Kompaktes Produktdetail ohne Scroll
- `src/app/globals.css` — `.mobile-sheet-*`, `.nutrition-mobile-page`, `.nutrition-glass-card`

### Sheet-Varianten

| Variante | Höhe | Verwendung |
|----------|------|------------|
| `full` | max. 88dvh | Lebensmittel-Suche |
| `compact` | max. 480px / auto | Produktdetails (alles sichtbar, kein Scroll) |

---

## Mobile Optimierungen

- **Max. Breite 430px** — zentriert wie native App (iPhone/Android)
- **100dvh** statt `vh` — korrekte Höhe mit Browser-Chrome
- **Safe-Area-Insets** — top/bottom auf Sheet-Root und Panel
- **Touch-Targets** — min. 44×44px (Favorit, Schnell-Hinzufügen)
- **Bottom-Nav ausblenden** — wenn Sheet offen (`body[data-mobileSheet]`)
- **Reduced Motion** — Animationen deaktivierbar

---

## UI Verbesserungen

### Bottom Sheet Design
- Glas-Effekt (`backdrop-filter: blur(28px)`)
- Slide-up-Animation (`cubic-bezier(0.32, 0.72, 0, 1)`)
- Drag-Handle oben
- Dunkler Backdrop mit Blur

### Produktdetail-Sheet
- 4-Spalten-Makro-Pills (kcal, Protein, Carbs, Fett)
- Horizontale Portions-Chips (kein vertikales Scrollen)
- Mahlzeit-Auswahl als Pill-Strip
- Großer „Hinzufügen"-Button (h-14, volle Breite)
- Favorit-Stern im Header

### Suchliste
- ⭐ Favorit und ➕ Schnell-Hinzufügen direkt sichtbar pro Zeile
- Glass-Cards (`nutrition-glass-card`)
- Skeleton-Loader während Suche
- Schnell-Chips (Pizza, Döner, …)

### Ernährungsseite
- `nutrition-mobile-page` Wrapper (430px, zentriert)
- Meal-Track-List mit Glass-Cards

---

## Performance

| Maßnahme | Effekt |
|----------|--------|
| Portal nur bei `open` | Kein DOM-Overhead wenn geschlossen |
| `memo()` auf Sheets & Rows | Weniger Re-Renders |
| Detail-State im Parent | Kein nested Modal in scrollbarem Content |
| Optimistic Quick-Add (bestehend) | Sofortiges UI-Feedback |
| 80ms Debounce Suche (bestehend) | Schnelle lokale Treffer zuerst |
| Body-Scroll-Lock | Kein Layout-Shift beim Öffnen |

---

## Schnell Hinzufügen (unverändert, jetzt sichtbar)

1. **➕ in Suchergebnissen** — ein Klick, Standardportion, optimistic add
2. **Produkt-Tap** — öffnet Detail-Sheet von unten (keine neue Seite)
3. **Route `/nutrition/add/[mealType]`** — Full-Screen-Sheet via Portal (Fallback/Deep-Link)

---

## Build & Tests

```bash
npm run build  # ✓ Erfolgreich (nur bestehende handleApiError-Warnungen)
```

### Manuelle Test-Checkliste

- [ ] iPhone: Sheet startet am unteren Rand, nicht abgeschnitten
- [ ] iPhone: Notch/Dynamic Island — Header des Sheets sichtbar
- [ ] Android: Kameraausschnitt — Safe Area korrekt
- [ ] Mahlzeit „+" → Such-Sheet öffnet sofort
- [ ] Produkt-Tap → Detail-Sheet darüber, Makros + Button ohne Scroll
- [ ] ➕ Schnell-Hinzufügen → sofort im Tracker, kein Dialog
- [ ] ⭐ Favorit togglen in Liste und Detail-Sheet
- [ ] Bottom-Nav ausgeblendet wenn Sheet offen
- [ ] Schließen per Backdrop / X-Button

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/ui/mobile-bottom-sheet.tsx` | Neu — Portal-Sheet |
| `src/components/nutrition/product-detail-sheet.tsx` | Neu — Kompakt-Detail |
| `src/components/nutrition/add-food-sheet.tsx` | MobileBottomSheet + Detail-Layer |
| `src/components/nutrition/product-search-panel.tsx` | Kein internes Modal, `onOpenDetail` |
| `src/components/nutrition/product-search-row.tsx` | Glass-Styling, Quick-Add sichtbar |
| `src/components/nutrition/meal-track-list.tsx` | Glass-Cards |
| `src/app/(app)/nutrition/page.tsx` | `nutrition-mobile-page` |
| `src/app/(app)/nutrition/add/[mealType]/page.tsx` | Portal-Sheet, Favorit-Fix |
| `src/app/globals.css` | Sheet-Styles, Safe Area, Nav-Hide |
| `src/components/layout/bottom-nav.tsx` | `app-bottom-nav` Klasse |
| `src/components/nutrition/product-detail-modal.tsx` | **Gelöscht** |

---

## Ergebnis

Die Ernährungsfunktion verhält sich jetzt wie eine native Fitness-App: Bottom Sheets von unten, keine abgeschnittenen Dialoge, sofortiges Hinzufügen und ein konsistentes Premium-Glas-Design auf 430px Mobile-Viewport.
