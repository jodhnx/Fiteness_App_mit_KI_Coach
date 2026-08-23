/** Shared main-tab gesture helpers — no heavy animation libs. */

import type { MainTab } from "@/components/layout/persistent-tab-provider";
import { MAIN_TABS } from "@/components/layout/persistent-tab-provider";

export const TAB_SWIPE = {
  /** px before axis locks */
  axisLock: 10,
  /** min horizontal distance to commit (or velocity) */
  minDistance: 72,
  /** px/ms — flick commits even with shorter distance */
  minVelocity: 0.45,
  /** max interactive drag as fraction of viewport */
  maxDragRatio: 0.42,
  /** spring back duration ms */
  settleMs: 220,
  /** commit slide duration ms */
  commitMs: 200,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isTouchLikePointer(e: PointerEvent | React.PointerEvent): boolean {
  return e.pointerType === "touch" || e.pointerType === "pen";
}

export function adjacentTab(
  current: MainTab,
  direction: -1 | 1
): MainTab | null {
  const idx = MAIN_TABS.indexOf(current);
  if (idx < 0) return null;
  const next = idx + direction;
  if (next < 0 || next >= MAIN_TABS.length) return null;
  return MAIN_TABS[next];
}

export function tabIndex(tab: MainTab): number {
  return MAIN_TABS.indexOf(tab);
}

/** Map horizontal scrub distance on bottom nav to tab index. */
export function scrubIndexFromDelta(
  startIndex: number,
  deltaX: number,
  tabWidth: number,
  count: number
): number {
  if (tabWidth <= 0) return startIndex;
  const steps = Math.round(deltaX / tabWidth);
  return Math.max(0, Math.min(count - 1, startIndex + steps));
}
