"use client";

/**
 * Thin client component so AppShell can use useSearchParams safely under Suspense.
 */

import { Suspense } from "react";
import { usePathScrollRestore } from "@/hooks/use-path-scroll-restore";

function PathScrollRestoreInner() {
  usePathScrollRestore();
  return null;
}

export function PathScrollRestore() {
  return (
    <Suspense fallback={null}>
      <PathScrollRestoreInner />
    </Suspense>
  );
}
