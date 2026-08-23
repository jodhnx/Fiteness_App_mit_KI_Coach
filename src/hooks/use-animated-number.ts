"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/tab-gestures";

/** Subtle numeric transition — no fake loading. */
export function useAnimatedNumber(value: number, durationMs = 220): number {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number | null>(null);
  const from = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || value === from.current) {
      from.current = value;
      setDisplay(value);
      return;
    }

    const start = from.current;
    const delta = value - start;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = value;
      }
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return display;
}
