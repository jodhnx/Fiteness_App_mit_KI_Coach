/**
 * Kein globales API-Prefetch — nur Next.js router.prefetch in der Navigation.
 * API-Daten werden pro Seite beim ersten Besuch geladen und im client-cache gehalten.
 */

/** Bewusst leer: früheres API-Warmup verursachte 6–7 parallele DB-Requests beim App-Start. */
export function prefetchRouteData(_pathname: string) {
  /* disabled */
}

export function prefetchAllRouteData() {
  /* disabled */
}

export const MAIN_NAV_ROUTES = [
  "/home",
  "/nutrition",
  "/workouts",
  "/activities",
  "/coach",
  "/profile",
  "/erfolge",
  "/settings",
];
