export const MAIN_NAV_ROUTES = [
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
  "/coach",
  "/profile",
  "/erfolge",
  "/settings",
] as const;

export function prefetchRouteData(_pathname: string) {
  /* API-Warmup deaktiviert */
}

export function prefetchAllRouteData() {
  /* deaktiviert */
}
