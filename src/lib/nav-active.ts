import { MORE_TAB_ROUTES } from "@/lib/nav-items";

/** Shared bottom-nav / sidebar active state — avoids false matches between tabs. */
export function isNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === "/home") {
    return pathname === "/home" || pathname === "/dashboard";
  }
  if (href === "/workouts") {
    if (pathname === "/workouts") return true;
    if (!pathname.startsWith("/workouts/")) return false;
    const moreWorkoutPrefixes = [
      "/workouts/my-plans",
      "/workouts/records",
      "/workouts/catalog",
      "/workouts/history",
      "/workouts/calendar",
    ];
    return !moreWorkoutPrefixes.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    );
  }
  if (href === "/progress") {
    return pathname === "/progress" || pathname.startsWith("/progress/");
  }
  if (href === "/more") {
    return MORE_TAB_ROUTES.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    );
  }
  if (href === "/activities") {
    return pathname === "/activities" || pathname.startsWith("/activities/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
