"use client";

import { memo } from "react";

export const HomeLoadingSkeleton = memo(function HomeLoadingSkeleton() {
  return (
    <div className="space-y-3 pb-4 max-w-lg mx-auto" aria-hidden="true">
      <div className="space-y-2 pb-2">
        <div className="h-5 w-32 rounded-lg bg-white/[0.04]" />
        <div className="h-9 w-48 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
      <div className="h-36 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
      <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
          />
        ))}
      </div>
    </div>
  );
});
