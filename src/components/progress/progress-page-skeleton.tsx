"use client";

import { memo } from "react";

export const ProgressPageSkeleton = memo(function ProgressPageSkeleton() {
  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-28 animate-pulse">
      <div className="h-14 rounded-2xl bg-zinc-800/80" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-zinc-800/70" />
        ))}
      </div>
      <div className="h-52 rounded-2xl bg-zinc-800/70" />
      <div className="h-40 rounded-2xl bg-zinc-800/60" />
      <div className="h-64 rounded-2xl bg-zinc-800/60" />
    </div>
  );
});
