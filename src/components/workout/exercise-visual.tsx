"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Activity,
  Dumbbell,
  Footprints,
  Hand,
  HeartPulse,
  PersonStanding,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MUSCLE_STYLES: Record<
  string,
  { label: string; gradient: string; Icon: typeof Dumbbell }
> = {
  CHEST: {
    label: "Brust",
    gradient: "from-rose-600/40 via-rose-900/60 to-zinc-950",
    Icon: Target,
  },
  BACK: {
    label: "Rücken",
    gradient: "from-sky-600/40 via-sky-900/60 to-zinc-950",
    Icon: PersonStanding,
  },
  SHOULDERS: {
    label: "Schultern",
    gradient: "from-amber-500/40 via-amber-900/60 to-zinc-950",
    Icon: Dumbbell,
  },
  BICEPS: {
    label: "Bizeps",
    gradient: "from-violet-600/40 via-violet-900/60 to-zinc-950",
    Icon: Hand,
  },
  TRICEPS: {
    label: "Trizeps",
    gradient: "from-indigo-600/40 via-indigo-900/60 to-zinc-950",
    Icon: Hand,
  },
  LEGS: {
    label: "Beine",
    gradient: "from-emerald-600/40 via-emerald-900/60 to-zinc-950",
    Icon: Footprints,
  },
  ABS: {
    label: "Bauch",
    gradient: "from-cyan-600/40 via-cyan-900/60 to-zinc-950",
    Icon: Activity,
  },
  FOREARMS: {
    label: "Unterarme",
    gradient: "from-orange-600/40 via-orange-900/60 to-zinc-950",
    Icon: Hand,
  },
  CALVES: {
    label: "Waden",
    gradient: "from-lime-600/40 via-lime-900/60 to-zinc-950",
    Icon: Footprints,
  },
  CARDIO: {
    label: "Cardio",
    gradient: "from-fuchsia-600/40 via-fuchsia-900/60 to-zinc-950",
    Icon: HeartPulse,
  },
};

type ExerciseVisualProps = {
  name: string;
  muscleGroup: string;
  imageUrl?: string | null;
  equipment?: string | null;
  className?: string;
  compact?: boolean;
};

export function ExerciseVisual({
  name,
  muscleGroup,
  imageUrl,
  equipment,
  className,
  compact,
}: ExerciseVisualProps) {
  const [imgOk, setImgOk] = useState(Boolean(imageUrl));
  const style = MUSCLE_STYLES[muscleGroup] ?? MUSCLE_STYLES.CHEST;
  const { Icon, gradient, label } = style;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-zinc-800/80",
        compact ? "h-24" : "h-40",
        className
      )}
    >
      {imageUrl && imgOk ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
          onError={() => setImgOk(false)}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br",
            gradient
          )}
        >
          <Icon
            className={cn(
              "text-white/25",
              compact ? "h-10 w-10" : "h-16 w-16"
            )}
            strokeWidth={1.25}
          />
          <p className="mt-2 text-xs font-medium uppercase tracking-widest text-white/50">
            {label}
          </p>
          {equipment && !compact && (
            <p className="mt-1 text-[10px] text-zinc-500">{equipment}</p>
          )}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
      {!compact && (
        <p className="absolute bottom-2 left-3 right-3 truncate text-sm font-semibold text-white">
          {name}
        </p>
      )}
    </div>
  );
}
