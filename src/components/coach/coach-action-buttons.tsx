"use client";

import Link from "next/link";
import type { CoachAction } from "@/lib/coach-actions";

export function CoachActionButtons({
  actions,
}: {
  actions: CoachAction[];
}) {
  if (!actions.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          prefetch
          className="inline-flex min-h-11 items-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 active:bg-cyan-500/20"
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}
