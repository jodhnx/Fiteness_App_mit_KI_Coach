"use client";

import { memo } from "react";

function greetingPart(): string {
  const h = new Date().getHours();
  return h < 12 ? "Morgen" : h < 18 ? "Mittag" : "Abend";
}

export const HomeGreeting = memo(function HomeGreeting({
  name,
}: {
  name?: string | null;
}) {
  const part = greetingPart();
  const trimmed = name?.trim();
  const first = trimmed?.split(/\s+/)[0];
  const rest = trimmed && trimmed.split(/\s+/).length > 1
    ? trimmed.split(/\s+/).slice(1).join(" ")
    : null;

  if (!first) {
    return (
      <div className="pb-2">
        <h1 className="text-[2rem] leading-tight font-bold text-white">
          Willkommen zurück
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Guten {part}</p>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <p className="text-lg font-medium text-zinc-400 tracking-tight">
        Guten {part},
      </p>
      <h1 className="text-[2rem] leading-tight font-bold text-white mt-0.5">
        <span className="text-accent">{first}</span>
        {rest && <span className="text-zinc-300 font-semibold"> {rest}</span>}
      </h1>
    </div>
  );
});
