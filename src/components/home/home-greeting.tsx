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
    <div className="pt-0.5 pb-1">
      <h1 className="text-[1.65rem] leading-tight font-bold text-white tracking-tight">
        {first ? (
          <>
            Guten {part}{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              {first}
            </span>
          </>
        ) : (
          "Willkommen zurück"
        )}
      </h1>
    </div>
  );
});
