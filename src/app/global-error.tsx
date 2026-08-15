"use client";

import { useEffect } from "react";

/**
 * Shows actionable detail so production crashes are diagnosable.
 * Chunk errors auto-recover once by clearing SW + reload.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.name, error.message, error.digest, error.stack);
    try {
      sessionStorage.setItem(
        "nexform:last-error",
        JSON.stringify({
          label: "global",
          name: error.name,
          message: error.message,
          digest: error.digest,
          at: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }

    const msg = `${error.name} ${error.message}`;
    const chunk =
      /ChunkLoadError|Loading chunk|dynamically imported module/i.test(msg);
    if (chunk) {
      try {
        if (!sessionStorage.getItem("nexform:chunk-reload")) {
          sessionStorage.setItem("nexform:chunk-reload", "1");
          if ("serviceWorker" in navigator) {
            void navigator.serviceWorker
              .getRegistrations()
              .then((regs) => Promise.all(regs.map((r) => r.unregister())))
              .finally(() => window.location.reload());
            return;
          }
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
  }, [error]);

  return (
    <html lang="de" className="dark">
      <body className="min-h-[100dvh] bg-zinc-950 text-white antialiased flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-zinc-950 font-extrabold tracking-wide">
            NX
          </div>
          <p className="text-lg font-semibold">Unerwarteter Fehler</p>
          <p className="text-xs text-zinc-500 break-words font-mono">
            {error.name}: {error.message}
            {error.digest ? ` · ${error.digest}` : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem("nexform:chunk-reload");
              } catch {
                /* ignore */
              }
              reset();
            }}
            className="w-full h-12 rounded-2xl bg-cyan-400 text-zinc-950 font-semibold"
          >
            Erneut versuchen
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/home";
            }}
            className="w-full h-11 rounded-2xl border border-zinc-700 text-zinc-200"
          >
            Zur Startseite
          </button>
        </div>
      </body>
    </html>
  );
}
