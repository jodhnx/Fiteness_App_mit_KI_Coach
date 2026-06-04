"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/workouts", label: "Übersicht", match: (p: string) => p === "/workouts" },
  { href: "/workouts/catalog", label: "Plan-Bibliothek", match: (p: string) => p.startsWith("/workouts/catalog") },
  { href: "/workouts/my-plans", label: "Meine Pläne", match: (p: string) => p.startsWith("/workouts/plans") || p === "/workouts/my-plans" },
  { href: "/workouts/exercises", label: "Übungen", match: (p: string) => p.startsWith("/workouts/exercises") },
  { href: "/workouts/analytics", label: "Statistik", match: (p: string) => p === "/workouts/analytics" },
  { href: "/workouts/calendar", label: "Kalender", match: (p: string) => p === "/workouts/calendar" },
  { href: "/workouts/history", label: "Historie", match: (p: string) => p === "/workouts/history" },
  { href: "/workouts/records", label: "Rekorde", match: (p: string) => p === "/workouts/records" },
];

export function WorkoutNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "bg-white/5 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
