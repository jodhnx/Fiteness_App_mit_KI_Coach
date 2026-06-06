export const MAIN_NAV_ROUTES = [
  "/home",
  "/workouts",
  "/progress",
  "/nutrition",
  "/coach",
  "/profile",
  "/erfolge",
  "/settings",
] as const;

export function prefetchRouteData(_pathname: string) {
  /* API-Warmup deaktiviert — verhindert DB-Stau beim Navigieren */
}

export function prefetchAllRouteData() {
  /* deaktiviert */
}
