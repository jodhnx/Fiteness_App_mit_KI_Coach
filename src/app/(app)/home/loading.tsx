import { HomeRoutePreview } from "@/components/layout/cached-route-loading";

/**
 * Never show a partial/fake home here — PersistentTabProvider keeps the last
 * real Home mounted. Returning null avoids the ~1s intermediate flash.
 */
export default function HomeLoading() {
  if (typeof window !== "undefined") {
    try {
      // Cold first paint only: if nothing was ever mounted, soft preview is OK
      const hasVisited = sessionStorage.getItem("nexform:tab-visited:home");
      if (!hasVisited) return <HomeRoutePreview />;
    } catch {
      /* ignore */
    }
  }
  return null;
}
