"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultPlanSets,
  parsePlanSetTargets,
  serializePlanSetTargets,
  type PlanSetTarget,
} from "@/lib/plan-exercise-sets";
import { cn } from "@/lib/utils";
import { WORKOUT_INPUT_PLACEHOLDERS } from "@/lib/workout-input-placeholders";

type Props = {
  id: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetReps: string;
  setTargets: unknown;
  onRemove: () => void;
  onReplace: () => void;
  onSaveSets: (sets: PlanSetTarget[]) => void;
};

export const PlanExerciseSetsCard = memo(function PlanExerciseSetsCard({
  id,
  name,
  muscleGroup,
  targetSets,
  targetReps,
  setTargets,
  onRemove,
  onReplace,
  onSaveSets,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const [sets, setSets] = useState<PlanSetTarget[]>(() =>
    parsePlanSetTargets(setTargets, targetSets, targetReps)
  );

  useEffect(() => {
    setSets(parsePlanSetTargets(setTargets, targetSets, targetReps));
  }, [setTargets, targetSets, targetReps]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = useCallback(
    (next: PlanSetTarget[], immediate = false) => {
      const clean = serializePlanSetTargets(next);
      setSets(clean);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (immediate) {
        onSaveSets(clean);
        return;
      }
      saveTimer.current = setTimeout(() => onSaveSets(clean), 400);
    },
    [onSaveSets]
  );

  const updateSet = (index: number, patch: Partial<PlanSetTarget>) => {
    const next = sets.map((s, i) => (i === index ? { ...s, ...patch } : s));
    persist(next);
  };

  const addSet = () => {
    persist([...sets, { weightKg: null, reps: null }]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    persist(sets.filter((_, i) => i !== index), true);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-zinc-800/90 bg-zinc-900/70 overflow-hidden mb-3",
        isDragging && "opacity-90 shadow-lg ring-1 ring-cyan-500/30"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-800/80">
        <button
          type="button"
          className="touch-none text-zinc-500 p-1 -ml-1"
          aria-label="Reihenfolge"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white truncate">{name}</p>
          <p className="text-xs text-zinc-500">{muscleGroup}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onReplace} title="Ersetzen">
          <RefreshCw className="h-4 w-4 text-cyan-400" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} title="Übung löschen">
          <Trash2 className="h-4 w-4 text-red-400" />
        </Button>
      </div>

      <div className="px-3 py-2 space-y-2">
        <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 text-[10px] uppercase tracking-wide text-zinc-500 px-0.5">
          <span>#</span>
          <span>Gewicht (kg)</span>
          <span>Wdh</span>
          <span />
        </div>

        {sets.map((set, index) => (
          <div
            key={`${id}-set-${index}`}
            className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 items-center"
          >
            <span className="text-sm font-medium text-zinc-400 tabular-nums">
              {index + 1}
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              placeholder={WORKOUT_INPUT_PLACEHOLDERS.weightKg}
              value={set.weightKg ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateSet(index, {
                  weightKg: v === "" ? null : Number(v),
                });
              }}
              className="h-11 text-base tabular-nums"
            />
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder={WORKOUT_INPUT_PLACEHOLDERS.reps}
              value={set.reps ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateSet(index, {
                  reps: v === "" ? null : Number(v),
                });
              }}
              className="h-11 text-base tabular-nums"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={sets.length <= 1}
              onClick={() => removeSet(index)}
              title="Satz löschen"
            >
              <Trash2 className="h-4 w-4 text-zinc-500" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-11 mt-1 border-dashed border-zinc-700 text-zinc-300"
          onClick={addSet}
        >
          <Plus className="h-4 w-4 mr-2" />
          Satz hinzufügen
        </Button>
      </div>
    </div>
  );
});

export function createDefaultSetTargets() {
  return defaultPlanSets();
}
