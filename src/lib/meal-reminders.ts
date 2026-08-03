export const MEAL_REMINDERS_KEY = "nexform:meal-reminders";

/** Local meal reminder times (hours, minutes) — breakfast / lunch / dinner. */
export const MEAL_REMINDER_SLOTS: { hour: number; minute: number; label: string }[] = [
  { hour: 8, minute: 0, label: "Frühstück" },
  { hour: 12, minute: 30, label: "Mittagessen" },
  { hour: 18, minute: 30, label: "Abendessen" },
];

export function mealRemindersEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MEAL_REMINDERS_KEY) === "1";
}

export function setMealRemindersEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(MEAL_REMINDERS_KEY, "1");
  else localStorage.removeItem(MEAL_REMINDERS_KEY);
  window.dispatchEvent(new Event("nexform:meal-reminders-changed"));
}

export function msUntilNextSlot(now = new Date()): { ms: number; label: string } {
  const dayMs = 24 * 60 * 60 * 1000;
  let best: { ms: number; label: string } | null = null;
  for (const slot of MEAL_REMINDER_SLOTS) {
    const next = new Date(now);
    next.setHours(slot.hour, slot.minute, 0, 0);
    let ms = next.getTime() - now.getTime();
    if (ms < 30_000) ms += dayMs;
    if (!best || ms < best.ms) best = { ms, label: slot.label };
  }
  return best ?? { ms: dayMs, label: "Mahlzeit" };
}
