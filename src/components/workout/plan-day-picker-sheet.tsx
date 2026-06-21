"use client";

import { memo } from "react";
import { Dumbbell, Play } from "lucide-react";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PlanDayOption = {
  id: string;
  name: string;
  exerciseCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  planName: string;
  days: PlanDayOption[];
  onSelectDay: (day: PlanDayOption) => void;
  starting?: boolean;
};

export const PlanDayPickerSheet = memo(function PlanDayPickerSheet({
  open,
  onClose,
  planName,
  days,
  onSelectDay,
  starting,
}: Props) {
  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Trainingstag wählen"
      subtitle={planName}
      variant="compact"
    >
      <div className="space-y-2">
        {days.map((day) => (
          <button
            key={day.id}
            type="button"
            disabled={starting}
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3.5",
              "text-left transition-colors active:scale-[0.98]",
              "hover:border-cyan-500/40 hover:bg-zinc-900",
              starting && "opacity-60 pointer-events-none"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/25">
              <Dumbbell className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white truncate">{day.name}</p>
              <p className="text-xs text-zinc-500">
                {day.exerciseCount}{" "}
                {day.exerciseCount === 1 ? "Übung" : "Übungen"}
              </p>
            </div>
            <Play className="h-4 w-4 shrink-0 text-cyan-400" />
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="w-full mt-3 rounded-xl text-zinc-400"
        onClick={onClose}
        disabled={starting}
      >
        Abbrechen
      </Button>
    </MobileBottomSheet>
  );
});
