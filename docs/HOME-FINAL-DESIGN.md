# Home Screen Final Design Update

Stand: Juni 2026 · `npm run build` erfolgreich

---

## Obere Leiste (unverändert)

Die Standard-Header-Leiste bleibt exakt wie im Screenshot:

- **Hamburger-Menü** links
- **Profilbild** mittig (XL, mit Ring)
- **Glocke** rechts

`HomeCompactHeader` wurde entfernt — auf `/home` gilt wieder derselbe `Header` wie überall.

---

## Neue Benachrichtigungen

### Notification Center
- Glocke öffnet ein **Bottom Sheet** (kein Redirect zu Einstellungen)
- Unread-Badge am Glocken-Icon
- Kategorien-Filter: **Training · Ernährung · Erfolge · Coach · System**
- Gelesen / ungelesen mit visueller Markierung
- **„Alle als gelesen markieren“**
- Tap auf Eintrag → Link + als gelesen markieren

### API
- `GET /api/notifications` — Liste + unreadCount
- `PATCH /api/notifications` — `{ id, read: true }` oder `{ markAllRead: true }`

### Automatische Sync-Events
Aus Nutzerdaten werden fehlende Benachrichtigungen erzeugt (dedupliziert, 24h):

- Neues Achievement freigeschaltet
- Trainingsstreak erreicht (≥3 Tage)
- Kalorienziel erreicht
- Proteinziel erreicht
- Coach Empfehlung
- Gewicht aktualisiert

### Neue Dateien
- `src/lib/notification-types.ts`
- `src/lib/notification-service.ts`
- `src/app/api/notifications/route.ts`
- `src/components/providers/notification-provider.tsx`
- `src/components/notifications/notification-center.tsx`

---

## Neue Home Features

### Reihenfolge
1. Obere Leiste (App-Shell Header)
2. **Begrüßung** — Guten Morgen/Mittag/Abend + Name
3. **Heutiger Fortschritt** — Kalorien übrig, Protein, Wasser, Schritte
4. **Nächstes Training** — Name + Starten-Button
5. **Wochenübersicht** — Trainings, Streak, Gewichtstrend
6. **Schnellaktionen** — Essen · Workout · Gewicht
7. **KI Coach Tipp**
8. **Letzte Erfolge** — 3 neueste Achievements

### Neue Komponenten
- `home-week-overview-card.tsx` — Wochenübersicht (Trainings, Streak, Gewicht)
- `home-quick-actions-bar.tsx` — 3 Schnellaktionen
- `home-recent-achievements.tsx` — Letzte Erfolge

### Home API
- `recentAchievements` in `/api/home` (letzte 3 User-Achievements)

---

## Performance Verbesserungen

| Bereich | Maßnahme |
|---------|----------|
| Home | Sofort-Render aus Cache, kein Skeleton |
| Notifications | Client-Cache 90s, optimistic mark-read |
| Header | Badge aus gecachtem Notification-State |
| Ernährung | Optimistic Quick-Add (bestehend) |

---

## Behobene Bugs

- Falscher kompakter Home-Header (Profil links) → zurück zum Original-Header
- Glocke verlinkte nur auf Einstellungen → öffnet jetzt Notification Center
- `HomeCompactHeader`-Sonderfall in `app-shell.tsx` entfernt

---

## Build

```bash
npm run build
```

Ergebnis: ✓ Compiled successfully · 102 Routen · keine TypeScript-Fehler
