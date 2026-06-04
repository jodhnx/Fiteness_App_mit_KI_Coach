"use client";

import { memo } from "react";

function greetingParts(name?: string | null) {
  const h = new Date().getHours();
  const part = h < 12 ? "Morgen" : h < 18 ? "Tag" : "Abend";
  const first = name?.trim().split(/\s+/)[0];
  return { part, first };
}

export const HomeGreeting = memo(function HomeGreeting({
  name,
}: {
  name?: string | null;
}) {
  const { part, first } = greetingParts(name);

  return (
    <div className="pt-5 pb-1">
      <p className="text-lg font-medium text-zinc-400 tracking-tight">
        Guten {part},
      </p>
      <h1 className="text-[2rem] leading-tight font-bold text-white mt-0.5">
        {first ? (
          <>
            <span className="text-accent">{first}</span>
            {name && name.trim().split(/\s+/).length > 1 && (
              <span className="text-zinc-300 font-semibold">
                {" "}
                {name.trim().split(/\s+/).slice(1).join(" ")}
              </span>
            )}
          </>
        ) : (
          <span className="text-accent">Athlet</span>
        )}
      </h1>
    </div>
  );
});
