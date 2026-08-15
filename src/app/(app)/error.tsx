"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
      <Button type="button" variant="premium" className="w-full" onClick={reset}>
        Erneut versuchen
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          window.location.href = "/home";
        }}
      >
        Zur Startseite
      </Button>
    </div>
  );
}
