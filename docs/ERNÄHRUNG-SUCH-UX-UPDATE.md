# Ernährung — Vereinfachte Such- & Hinzufügen-UX

**Datum:** Juni 2026  
**Ziel:** Lebensmittel hinzufügen in wenigen Klicks — wie Yazio/MyFitnessPal, aber cleaner und schneller

---

## Zusammenfassung

Das Hinzufügen von Lebensmitteln wurde komplett vereinfacht. Statt Bottom Sheets mit vielen Einstellungen gibt es jetzt ein **Fullscreen-Popup** mit großer Suchleiste, Auto-Fokus und Ein-Klick-Hinzufügen. Keine extra Seite, keine Formulare, keine Dialoge nach dem ➕.

`npm run build` — erfolgreich, keine TypeScript-Fehler.

---

## Neuer Ablauf

```
+ Lebensmittel (Mahlzeit)
        ↓
Fullscreen-Popup öffnet sofort
        ↓
Tastatur + Fokus auf Suchfeld (automatisch)
        ↓
┌─ Leer ─────────────────────────────┐
│  Häufig verwendet                  │
│  Zuletzt verwendet                 │
└────────────────────────────────────┘
        ↓ (Tippt in Suche)
┌─ Suche aktiv ──────────────────────┐
│  Suchergebnisse mit kcal + ➕      │
└────────────────────────────────────┘
        ↓
➕ = Sofort hinzufügen (Standardportion, optimistic)
        ↓
Tap auf Name = Optional Detail (Makros + Portionen)
```

---

## Neue Such-UX

| Element | Verhalten |
|---------|-----------|
| **Suchleiste** | Groß, oben, Placeholder „Lebensmittel suchen…" |
| **Auto-Fokus** | Beim Öffnen sofort — Tastatur erscheint ohne weiteren Klick |
| **Häufig verwendet** | Aus API-History oder Fallback (Whey, Banane, Haferflocken, …) |
| **Zuletzt verwendet** | Aus API-History oder Fallback (Pizza Salami, Skyr, …) |
| **Beim Tippen** | Häufig/Zuletzt ausblenden → nur Suchergebnisse |
| **1 Zeichen** | Lokale Filter + Standardgerichte sofort |
| **2+ Zeichen** | API-Suche (lokal zuerst, dann DACH) |

### Suchergebnis-Zeile

```
Pizza Salami
(350 kcal pro Portion)                    [➕]
```

Kcal und Portionstext werden intelligent aus `getPortionPresets()` berechnet.

---

## Neue Hinzufügen-UX

| Aktion | Ergebnis |
|--------|----------|
| **➕ tippen** | Sofort hinzufügen mit Standardportion |
| **Name tippen** | Optionale Detailansicht (Makros, Portionen, Hinzufügen) |
| **Keine extra Seite** | `/nutrition/add/[mealType]` → Redirect zu `/nutrition?add=…` |
| **Kein Toast** | Kein Erfolgs-Popup — UI aktualisiert sich sofort (optimistic) |
| **Popup bleibt offen** | Mehrere Lebensmittel nacheinander möglich |

---

## Performance-Verbesserungen

| Maßnahme | Effekt |
|----------|--------|
| **60ms Debounce** | Schnellere Suche als zuvor (80ms) |
| **Keine Slide-Animation** | Popup erscheint sofort |
| **Optimistic Updates** | Ernährung + Home aktualisieren vor API-Antwort |
| **Search-Cache** | Wiederholte Suchen aus Client-Cache |
| **Lokale 1-Zeichen-Suche** | Sofortige Treffer ohne API-Wait |
| **Kein Success-Toast** | Weniger UI-Unterbrechung |
| **Portal zu `document.body`** | Kein Clipping, kein Z-Index-Konflikt |

---

## Behobene Mobile Bugs

| Problem | Lösung |
|---------|--------|
| Abgeschnittene Fenster | Fullscreen-Popup portaled zu `body` |
| Scroll-Bugs | Eigener Scroll-Container, Body-Lock |
| Header-Konflikte | z-index 200/210 über App-Chrome |
| Safe-Area | `env(safe-area-inset-*)` auf Popup + Detail |
| Bottom-Nav Überlappung | Nav ausgeblendet bei `data-foodAddPopup` |
| Extra Seite | Redirect statt eigener Add-Route |

---

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/components/nutrition/food-add-popup.tsx` | Haupt-Popup (Suche + Listen) |
| `src/components/nutrition/food-quick-row.tsx` | Zeile: Name, kcal, ➕ |
| `src/components/nutrition/food-detail-popup.tsx` | Optionale Detailansicht |
| `src/lib/food/quick-add-display.ts` | kcal + Portionstext für Zeilen |

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/app/(app)/nutrition/page.tsx` | `FoodAddPopup`, URL-Param `?add=` |
| `src/app/(app)/nutrition/add/[mealType]/page.tsx` | Server-Redirect |
| `src/components/home/home-quick-actions.tsx` | Link → `/nutrition?add=LUNCH` |
| `src/components/nutrition/meal-track-list.tsx` | „+ Lebensmittel"-Button bei leerer Mahlzeit |
| `src/hooks/use-food-quick-add.ts` | Kein Success-Toast |
| `src/app/globals.css` | `.food-add-popup-*` Styles |

## Legacy (nicht mehr im Hauptflow)

Diese Komponenten bleiben vorerst im Repo, werden aber nicht mehr für das Hinzufügen genutzt:

- `add-food-sheet.tsx`
- `product-search-panel.tsx`
- `product-detail-sheet.tsx`
- `mobile-bottom-sheet.tsx`

---

## Test-Checkliste

- [ ] + an Mahlzeit → Popup sofort, Tastatur offen
- [ ] Häufig/Zuletzt sichtbar ohne Suche
- [ ] Tippen → Bereiche verschwinden, Ergebnisse erscheinen
- [ ] ➕ → Eintrag sofort in Mahlzeit, kcal aktualisiert
- [ ] Tap Name → Detail mit Portionen
- [ ] Home von Ernährung → gleiche kcal (central sync)
- [ ] iPhone Safe Area OK
- [ ] `/nutrition?add=LUNCH` öffnet Popup direkt
