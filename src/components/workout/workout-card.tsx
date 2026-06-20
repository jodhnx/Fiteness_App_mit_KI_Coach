"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Clock, Dumbbell, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JourneySession } from "@/lib/workout-journey";

type Props = {
  session: JourneySession;
  onDelete: (id: string) => void;
  deleting?: boolean;
};

export const WorkoutCard = memo(function WorkoutCard({
  session,
  onDelete,
  deleting,
}: Props) {
  const dateLabel = format(new Date(session.completedAt), "dd.MM.yyyy", { locale: de });

  const handleDelete = useCallback(() => {
    if (!window.confirm(`„${session.name}" wirklich löschen?`)) return;
    onDelete(session.id);
  }, [onDelete, session.id, session.name]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start gap-2">
        <Calendar className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {dateLabel} — {session.name}
          </p>
          {session.dayName && (
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {session.dayName}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {session.durationMin} min · {session.exerciseCount} Übungen ·{" "}
            {session.volumeKg.toLocaleString("de-DE")} kg
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Link href={`/workouts/journey/${session.id}/edit`} prefetch className="flex-1">
          <Button type="button" variant="secondary" className="w-full h-10 rounded-xl text-xs">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 rounded-xl text-red-400 hover:text-red-300"
          disabled={deleting}
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
