"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function WorkoutBackLink({ href = "/workouts", label = "Training" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-cyan-400 mb-4 -mt-1"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
