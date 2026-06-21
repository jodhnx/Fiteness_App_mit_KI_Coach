"use client";

import { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}
