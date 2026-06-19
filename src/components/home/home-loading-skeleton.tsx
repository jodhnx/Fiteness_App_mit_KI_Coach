"use client";

import { memo } from "react";

export const HomeLoadingSkeleton = memo(function HomeLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Dashboard wird geladen">
      <div className="space-y-2 pb-2">
        <div className="h-5 w-32 rounded-lg bg-zinc-800" />
        <div className="h-9 w-48 rounded-lg bg-zinc-800" />
      </div>
      <div className="h-52 rounded-2xl bg-zinc-800/80" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-zinc-800/60" />
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-zinc-800/60" />
      <div className="h-36 rounded-2xl bg-zinc-800/60" />
    </div>
  );
});
