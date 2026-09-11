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
      <div className="h-16 w-16 rounded-3xl bg-zinc-100 border border-zinc-200 flex items-center justify-center dark:bg-zinc-800/80 dark:border-zinc-700/60">
        <span className="text-2xl" aria-hidden>
          👥
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-bold text-zinc-900 dark:text-white">
          Community konnte nicht geladen werden
        </p>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-xs dark:text-zinc-400">
          Bitte überprüfe deine Verbindung und versuche es erneut.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          type="button"
          className="h-12 rounded-2xl bg-accent text-white font-semibold flex items-center justify-center gap-2"
          onClick={reset}
        >
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </button>
        <button
          type="button"
          className="h-11 rounded-2xl border border-zinc-200 bg-white text-zinc-700 flex items-center justify-center gap-2 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300"
          onClick={() => {
            window.location.href = "/home";
          }}
        >
          <Home className="h-4 w-4" />
          Zur Startseite
        </button>
      </div>
    </div>
  );
}
