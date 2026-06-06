/** Shared bottom-nav / sidebar active state — avoids false matches between tabs. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/home") {
    return pathname === "/home" || pathname === "/dashboard";
  }
  if (href === "/workouts") {
    return pathname === "/workouts" || pathname.startsWith("/workouts/");
  }
  if (href === "/progress") {
    return pathname === "/progress" || pathname.startsWith("/progress/");
  }
  if (href === "/activities") {
    return pathname === "/activities" || pathname.startsWith("/activities/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
