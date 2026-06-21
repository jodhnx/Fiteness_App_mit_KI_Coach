"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Single scroll container — header/bottom nav stay fixed; tab switch resets scroll before paint. */
export function AppScrollMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = 0;
    el.scrollLeft = 0;
  }, [pathname]);

  return (
    <main
      ref={ref}
      className="app-main-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-4"
    >
      {children}
    </main>
  );
}
