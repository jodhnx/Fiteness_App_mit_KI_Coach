"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";

export default function SocialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[social/error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-5">
      <div className="h-16 w-16 rounded-3xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
        <span className="text-2xl">👥</span>
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-bold text-white">Community konnte nicht geladen werden</p>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
          Bitte überprüfe deine Verbindung und versuche es erneut.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          type="button"
          className="h-12 rounded-2xl bg-accent text-black font-semibold flex items-center justify-center gap-2"
          onClick={reset}
        >
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </button>
        <button
          type="button"
          className="h-11 rounded-2xl border border-zinc-700 text-zinc-300 flex items-center justify-center gap-2"
          onClick={() => { window.location.href = "/home"; }}
        >
          <Home className="h-4 w-4" />
          Zur Startseite
        </button>
      </div>
    </div>
  );
}
