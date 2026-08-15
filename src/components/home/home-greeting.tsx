"use client";

import { memo } from "react";

function greetingPart(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Tag";
  return "Abend";
}

export const HomeGreeting = memo(function HomeGreeting({
  name,
}: {
  name?: string | null;
}) {
  const part = greetingPart();
  const first = name?.trim()?.split(/\s+/)[0];

  return (
    <div className="pb-1 pt-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Heute
      </p>
      <h1 className="mt-0.5 text-[1.55rem] font-bold leading-tight tracking-tight text-white">
        {first ? (
          <>
            Guten {part},{" "}
            <span className="text-accent">{first}</span>
          </>
        ) : (
          "Willkommen zurück"
        )}
      </h1>
    </div>
  );
});
