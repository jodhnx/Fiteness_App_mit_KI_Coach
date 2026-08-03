import { HomeRoutePreview } from "@/components/layout/cached-route-loading";

/** Dedicated home loading — never shows another tab's shell. */
export default function HomeLoading() {
  return <HomeRoutePreview />;
}
