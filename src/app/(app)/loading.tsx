import { CachedRouteLoading } from "@/components/layout/cached-route-loading";

/** Instant cached preview during route transitions — real values, no spinners. */
export default function AppLoading() {
  return <CachedRouteLoading />;
}
