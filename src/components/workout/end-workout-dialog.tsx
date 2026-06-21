"use client";

import { memo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

type Props = {
  open: boolean;
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
};

/** Instant finish modal — no animation delay */
export const EndWorkoutDialog = memo(function EndWorkoutDialog({
  open,
  defaultName,
  onSave,
  onCancel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-workout-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
        <h2 id="end-workout-title" className="text-lg font-bold text-white">
          Training beenden
        </h2>
        <p className="text-sm text-zinc-400 mt-1">Gib deinem Workout einen Namen.</p>

        <Input
          ref={inputRef}
          defaultValue={defaultName}
          className="mt-4 h-12 rounded-xl bg-zinc-950 border-zinc-700"
          placeholder="Workout 001"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave((e.target as HTMLInputElement).value.trim() || defaultName);
            }
          }}
        />

        <div className={cn("flex gap-2 mt-4")}>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 h-12 rounded-xl"
            onClick={onCancel}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            className="flex-1 h-12 rounded-xl"
            onClick={() => {
              const v = inputRef.current?.value.trim();
              onSave(v || defaultName);
            }}
          >
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
});
