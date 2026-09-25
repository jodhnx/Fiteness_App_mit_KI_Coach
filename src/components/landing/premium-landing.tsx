"use client";

import Link from "next/link";
import {
  Bot,
  Dumbbell,
  Apple,
  LineChart,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Training",
    desc: "Individuelle Workouts und Trainingspläne",
    accent: "text-[var(--accent,#6d5dfe)]",
    soft: "bg-[var(--accent,#6d5dfe)]/12",
  },
  {
    icon: Apple,
    title: "Ernährung",
    desc: "Kalorien, Makros und Mahlzeiten",
    accent: "text-orange-400",
    soft: "bg-orange-500/12",
  },
  {
    icon: Bot,
    title: "KI-Coach",
    desc: "Persönliche Empfehlungen",
    accent: "text-teal-400",
    soft: "bg-teal-500/12",
  },
  {
    icon: LineChart,
    title: "Fortschritt",
    desc: "Deine Entwicklung im Überblick",
    accent: "text-emerald-400",
    soft: "bg-emerald-500/12",
  },
  {
    icon: HeartPulse,
    title: "Gesundheit",
    desc: "Aktivität und Gesundheitsdaten",
    accent: "text-sky-400",
    soft: "bg-sky-500/12",
  },
  {
    icon: Sparkles,
    title: "Empfehlungen",
    desc: "Tägliche Tipps aus deinen Daten",
    accent: "text-amber-400",
    soft: "bg-amber-500/12",
  },
] as const;

function DashboardPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-[22rem] animate-[landingFade_0.45s_ease-out_both]"
      style={{ animationDelay: "80ms" }}
      aria-hidden
    >
      {/* Soft stacked layers behind */}
      <div className="absolute inset-x-4 top-3 h-[88%] rounded-[1.25rem] border border-white/[0.05] bg-[#14141a] rotate-[-2.5deg]" />
      <div className="absolute inset-x-2 top-1.5 h-[94%] rounded-[1.25rem] border border-white/[0.06] bg-[#16161d] rotate-[1.8deg]" />

      {/* Main preview card */}
      <div className="relative rounded-[1.25rem] border border-white/[0.1] bg-[#1a1a21] p-3.5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Heute
            </p>
            <p className="text-[13px] font-bold text-white mt-0.5">Dashboard</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent,#6d5dfe)]/20 text-[10px] font-bold text-[var(--accent,#6d5dfe)]">
            NX
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#121218] px-3 py-2.5 mb-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.65rem] font-bold tabular-nums tracking-tight text-white">
              2.940
            </span>
            <span className="text-[12px] font-medium text-zinc-500">kcal</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">noch übrig</p>
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="w-[42%] bg-[var(--accent,#6d5dfe)]" />
            <div className="w-[33%] bg-teal-400" />
            <div className="w-[18%] bg-orange-400" />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] tabular-nums text-zinc-400">
            <span>P 182g</span>
            <span>C 295g</span>
            <span>F 76g</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-[#121218] px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
              Training
            </p>
            <p className="mt-1 text-[12px] font-semibold text-white">Upper Body</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#121218] px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
              Schritte
            </p>
            <p className="mt-1 text-[12px] font-semibold tabular-nums text-white">
              8.420
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-teal-500/25 bg-teal-500/5 px-2.5 py-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-400" />
          <p className="text-[11px] font-medium text-zinc-300 truncate">
            KI Coach · Protein priorisieren
          </p>
        </div>
      </div>
    </div>
  );
}

export function PremiumLanding() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] text-white flex flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-28 left-1/2 h-72 w-[32rem] -translate-x-1/2 rounded-full bg-[var(--accent,#6d5dfe)]/18 blur-3xl" />
        <div className="absolute top-[40%] -left-16 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:max-w-2xl lg:px-10">
        <header className="pt-1 pb-5 text-center animate-[landingFade_0.35s_ease-out_both]">
          <p className="text-[2rem] font-extrabold tracking-tight sm:text-[2.35rem]">
            NEX<span className="text-[var(--accent,#6d5dfe)]">FORM</span>
          </p>
          <h1 className="mt-3 text-[1.45rem] font-bold leading-snug tracking-tight text-white sm:text-[1.65rem]">
            Dein Körper. Dein Plan.
            <br />
            <span className="text-zinc-300 font-semibold">Dein KI-Coach.</span>
          </h1>
          <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-zinc-400 max-w-sm mx-auto">
            Dein persönlicher KI Fitness Coach — Training, Ernährung und
            Fortschritt in einer App.
          </p>
        </header>

        <main className="flex flex-1 flex-col gap-6">
          <DashboardPreview />

          <section
            className="grid grid-cols-2 gap-2"
            aria-label="Funktionen"
          >
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "flex flex-col gap-2 rounded-[1.125rem] border border-white/[0.08] bg-[#1a1a21] px-3 py-3 min-h-[5.5rem]",
                  "animate-[landingFade_0.4s_ease-out_both]"
                )}
                style={{ animationDelay: `${120 + i * 35}ms` }}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    f.soft,
                    f.accent
                  )}
                >
                  <f.icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium leading-snug text-zinc-100">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <p
            className="text-center text-[16px] font-semibold tracking-tight text-white animate-[landingFade_0.4s_ease-out_both]"
            style={{ animationDelay: "360ms" }}
          >
            Dein Training. Deine Ernährung.
            <br />
            <span className="text-zinc-400 font-medium">Dein Fortschritt.</span>
          </p>

          <div
            className="mt-auto pt-2 space-y-2.5 animate-[landingFade_0.4s_ease-out_both] lg:max-w-md lg:mx-auto lg:w-full"
            style={{ animationDelay: "400ms" }}
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
          [class*="animate-[landingFade"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
