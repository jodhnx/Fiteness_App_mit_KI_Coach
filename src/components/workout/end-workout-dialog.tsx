"use client";

import { memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

type Props = {
  open: boolean;
  variant: "finish" | "leave";
  defaultName: string;
  completedSets?: number;
  totalSets?: number;
  volumeKg?: number;
  durationSec?: number;
  exerciseCount?: number;
  saving?: boolean;
  onFinish: (name: string) => void;
  onContinue: () => void;
  onSaveAndExit?: () => void;
  onDiscard?: () => void;
};

function formatDuration(sec: number | undefined) {
  if (sec == null || sec < 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Instant finish / leave modal — no animation delay */
export const EndWorkoutDialog = memo(function EndWorkoutDialog({
  open,
  variant,
  defaultName,
  completedSets,
  totalSets,
  volumeKg,
  durationSec,
  exerciseCount,
  saving,
  onFinish,
  onContinue,
  onSaveAndExit,
  onDiscard,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(open);

  if (!open) return null;

  const durationLabel = formatDuration(durationSec);

  if (variant === "leave") {
    return (
      <div
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-900/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-workout-title"
      >
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-white/[0.08] dark:bg-zinc-900">
          <h2
            id="leave-workout-title"
            className="text-lg font-bold text-zinc-900 dark:text-white"
          >
            Workout läuft noch.
          </h2>
          <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">
            Fortsetzen, speichern und verlassen, oder verwerfen.
          </p>
          <div className="mt-4 space-y-2">
            <Button
              type="button"
              className="w-full h-12 rounded-xl"
              onClick={onContinue}
            >
              Fortsetzen
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full h-12 rounded-xl"
              onClick={onSaveAndExit}
            >
              Speichern & verlassen
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-12 rounded-xl text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              onClick={() => {
                if (
                  !window.confirm(
                    "Workout wirklich verwerfen? Alle Sätze dieser Session gehen verloren."
                  )
                ) {
                  return;
                }
                onDiscard?.();
              }}
            >
              Verwerfen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-workout-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl mb-[env(safe-area-inset-bottom,0px)] dark:border-white/[0.08] dark:bg-zinc-900">
        <h2
          id="end-workout-title"
          className="text-lg font-bold text-zinc-900 dark:text-white"
        >
          Training beenden
        </h2>
        <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">
          Zusammenfassung vor dem Speichern
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {durationLabel && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/[0.06] dark:bg-zinc-950/60">
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                Dauer
              </dt>
              <dd className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                {durationLabel}
              </dd>
            </div>
          )}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/[0.06] dark:bg-zinc-950/60">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
              Übungen
            </dt>
            <dd className="font-semibold tabular-nums text-zinc-900 dark:text-white">
              {exerciseCount ?? 0}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/[0.06] dark:bg-zinc-950/60">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
              Sätze
            </dt>
            <dd className="font-semibold tabular-nums text-zinc-900 dark:text-white">
              {completedSets ?? 0}/{totalSets ?? 0}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/[0.06] dark:bg-zinc-950/60">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
              Volumen
            </dt>
            <dd className="font-semibold tabular-nums text-zinc-900 dark:text-white">
              {(volumeKg ?? 0).toLocaleString("de-DE")} kg
            </dd>
          </div>
        </dl>

        {completedSets === 0 && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">
            Noch kein Satz abgeschlossen.
          </p>
        )}

        <Input
          ref={inputRef}
          defaultValue={defaultName}
          className="mt-4 h-12 rounded-xl bg-white border-zinc-200 keyboard-stable-input dark:bg-zinc-950 dark:border-zinc-700"
          placeholder="Workout-Name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onFinish((e.target as HTMLInputElement).value.trim() || defaultName);
            }
          }}
        />

        <div className={cn("flex gap-2 mt-4")}>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 h-12 rounded-xl"
            onClick={onContinue}
            disabled={saving}
          >
            Zurück
          </Button>
          <Button
            type="button"
            className="flex-1 h-12 rounded-xl"
            disabled={saving}
            onClick={() => {
              const v = inputRef.current?.value.trim();
              onFinish(v || defaultName);
            }}
          >
            {saving ? "Speichert…" : "Fertig"}
          </Button>
        </div>
      </div>
    </div>
  );
});
