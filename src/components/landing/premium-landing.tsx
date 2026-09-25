"use client";

import Link from "next/link";
import {
  Bot,
  Dumbbell,
  Apple,
  LineChart,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Training",
    desc: "Individuelle Trainingspläne und Workouts",
    accent: "text-[var(--accent,#6d5dfe)]",
    soft: "bg-[var(--accent,#6d5dfe)]/12",
  },
  {
    icon: Apple,
    title: "Ernährung",
    desc: "Kalorien, Makros, Lebensmittel und Mahlzeiten",
    accent: "text-orange-400",
    soft: "bg-orange-500/12",
  },
  {
    icon: Bot,
    title: "KI-Coach",
    desc: "Persönliche Empfehlungen auf Basis deiner Daten",
    accent: "text-teal-400",
    soft: "bg-teal-500/12",
  },
  {
    icon: LineChart,
    title: "Fortschritt",
    desc: "Gewicht, Training und persönliche Entwicklung",
    accent: "text-emerald-400",
    soft: "bg-emerald-500/12",
  },
  {
    icon: HeartPulse,
    title: "Gesundheit",
    desc: "Aktivität und kompatible Gesundheitsdaten",
    accent: "text-sky-400",
    soft: "bg-sky-500/12",
  },
] as const;

export function PremiumLanding() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] text-white flex flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-[var(--accent,#6d5dfe)]/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-teal-500/8 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:max-w-xl lg:px-8">
        <header
          className="pt-2 pb-6 text-center animate-[landingFade_0.35s_ease-out_both]"
        >
          <p className="text-[1.75rem] font-extrabold tracking-tight sm:text-[2rem]">
            NEX<span className="text-[var(--accent,#6d5dfe)]">FORM</span>
          </p>
          <p className="mt-2 text-[15px] font-medium text-zinc-400">
            Dein persönlicher KI Fitness Coach
          </p>
        </header>

        <main className="flex flex-1 flex-col">
          <section
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            aria-label="Funktionen"
          >
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "flex items-start gap-3 rounded-[1.125rem] border border-white/[0.08] bg-[#1a1a21] px-3.5 py-3",
                  "animate-[landingFade_0.4s_ease-out_both]",
                  i === FEATURES.length - 1 && "sm:col-span-2 sm:max-w-md sm:mx-auto sm:w-full"
                )}
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    f.soft,
                    f.accent
                  )}
                >
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium leading-snug text-zinc-100">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <p
            className="mt-7 text-center text-[17px] font-semibold tracking-tight text-white animate-[landingFade_0.4s_ease-out_both]"
            style={{ animationDelay: "280ms" }}
          >
            Alles für deinen Fortschritt.
            <br className="sm:hidden" />{" "}
            <span className="text-zinc-400 font-medium">In einer App.</span>
          </p>

          <div
            className="mt-auto pt-8 space-y-3 animate-[landingFade_0.4s_ease-out_both]"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href="/register"
              prefetch
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--accent,#6d5dfe)] text-[15px] font-semibold text-white active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#6d5dfe)]/50"
            >
              Registrieren
            </Link>
            <Link
              href="/login"
              prefetch
              className="flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.12] bg-transparent text-[15px] font-semibold text-zinc-200 active:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              Anmelden
            </Link>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes landingFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\[landingFade_0\.35s_ease-out_both\],
          .animate-\[landingFade_0\.4s_ease-out_both\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
