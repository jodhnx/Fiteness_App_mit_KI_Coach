"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="de" className="dark">
      <body className="min-h-[100dvh] bg-zinc-950 text-white antialiased flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-zinc-950 font-extrabold tracking-wide">
            NX
          </div>
          <p className="text-lg font-semibold">Etwas ist schiefgelaufen</p>
          <p className="text-sm text-zinc-400">
            NEXFORM konnte nicht geladen werden. Bitte erneut versuchen.
          </p>
          <button
            type="button"
            onClick={reset}
            className="w-full h-12 rounded-2xl bg-cyan-400 text-zinc-950 font-semibold"
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
