import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Navigate with View Transitions API when supported. */
export function navigateWithTransition(
  href: string,
  router: AppRouterInstance,
  onBefore?: () => void
) {
  onBefore?.();

  if (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof document.startViewTransition === "function"
  ) {
    document.startViewTransition(() => {
      router.push(href);
    });
    return;
  }

  router.push(href);
}
