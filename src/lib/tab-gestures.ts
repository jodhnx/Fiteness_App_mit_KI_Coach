/** Shared main-tab gesture helpers — no heavy animation libs. */

import type { MainTab } from "@/components/layout/persistent-tab-provider";
import { MAIN_TABS } from "@/components/layout/persistent-tab-provider";

export const TAB_SWIPE = {
  axisLock: 10,
  minDistance: 72,
  minVelocity: 0.45,
  maxDragRatio: 0.42,
  settleMs: 220,
  commitMs: 200,
} as const;

/** Bottom nav long-press + drag thresholds */
export const NAV_DRAG = {
  longPressMs: 360,
  /** Vertical move before long press fires → cancel (scroll intent) */
  verticalCancelPx: 14,
  /** Horizontal move before long press → still allow long press if mostly still */
  preLockSlopPx: 18,
  /** After scrub starts, min px to snap tab on release */
  snapThreshold: 0.35,
  indicatorTransitionMs: 240,
  scrubFollowMs: 0,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isTouchLikePointer(
  e: PointerEvent | React.PointerEvent
): boolean {
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

/** Continuous tab position for live indicator follow (0 … count-1). */
export function scrubPositionFromDelta(
  startIndex: number,
  deltaX: number,
  tabWidth: number,
  count: number
): number {
  if (tabWidth <= 0) return startIndex;
  const pos = startIndex + deltaX / tabWidth;
  return Math.max(0, Math.min(count - 1, pos));
}

/** Nearest tab index from fractional position. */
export function snapScrubIndex(position: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(position)));
}

/** Center X of tab index as fraction of bar width (0–1). */
export function tabCenterFraction(index: number, count: number): number {
  return (index + 0.5) / count;
}

/** @deprecated discrete steps — prefer scrubPositionFromDelta */
export function scrubIndexFromDelta(
  startIndex: number,
  deltaX: number,
  tabWidth: number,
  count: number
): number {
  return snapScrubIndex(scrubPositionFromDelta(startIndex, deltaX, tabWidth, count), count);
}
