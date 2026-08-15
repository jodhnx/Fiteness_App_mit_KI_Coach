"use client";

import { useEffect } from "react";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <p className="text-lg font-semibold text-white">Bereich konnte nicht geladen werden</p>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Navigation und andere Menüs bleiben nutzbar. Bitte erneut versuchen.
      </p>
      <button
        type="button"
        className="w-full h-12 rounded-2xl bg-cyan-400 text-zinc-950 font-semibold"
        onClick={reset}
      >
        Erneut versuchen
      </button>
      <button
        type="button"
        className="w-full h-11 rounded-2xl border border-zinc-700 text-zinc-200"
        onClick={() => {
          window.location.href = "/home";
        }}
      >
        Zur Startseite
      </button>
    </div>
  );
}
