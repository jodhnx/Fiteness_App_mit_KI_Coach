"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startGuestSession } from "@/lib/guest-client";
import { toast } from "sonner";
import { useState } from "react";
import {
  Bot,
  Dumbbell,
  Apple,
  LineChart,
  Trophy,
  Zap,
  HeartPulse,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Bot,
    title: "KI Fitness Coach",
    desc: "Persönliche Tipps, Pläne und Motivation — rund um die Uhr.",
    color: "text-violet-400",
  },
  {
    icon: Dumbbell,
    title: "Trainingspläne",
    desc: "Quick Workout, intelligenter Plan-Konfigurator, Live-Tracking.",
    color: "text-cyan-400",
  },
  {
    icon: Apple,
    title: "Ernährungstracker",
    desc: "Kalorien, Makros und Mahlzeiten — präzise wie MyFitnessPal.",
    color: "text-emerald-400",
  },
  {
    icon: LineChart,
    title: "Fortschrittsanalyse",
    desc: "Gewicht, Volumen, Kalorien — alle Trends auf einen Blick.",
    color: "text-orange-400",
  },
  {
    icon: Trophy,
    title: "Erfolge & Level",
    desc: "XP, Badges und Streaks — bleib motiviert.",
    color: "text-amber-400",
  },
  {
    icon: HeartPulse,
    title: "Regenerationsanalyse",
    desc: "Muskelgruppen-Recovery für smarteres Training.",
    color: "text-rose-400",
  },
];

const MOCK_SCREENS = [
  { label: "Home Dashboard", gradient: "from-cyan-500/20 to-violet-500/20" },
  { label: "Live Workout", gradient: "from-amber-500/20 to-orange-500/20" },
  { label: "Ernährung", gradient: "from-emerald-500/20 to-teal-500/20" },
  { label: "Fortschritt", gradient: "from-violet-500/20 to-fuchsia-500/20" },
];

export function PremiumLanding() {
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);

  async function continueAsGuest() {
    setGuestLoading(true);
    const result = await startGuestSession();
    setGuestLoading(false);
    if (!result.ok) {
      toast.error(result.error ?? "Gastmodus fehlgeschlagen");
      return;
    }
    toast.success("Willkommen! Du bist als Gast angemeldet.");
    router.replace("/home");
  }

  return (
    <div className="gradient-mesh min-h-[100dvh] flex flex-col">
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 max-w-lg mx-auto w-full">
        <span className="text-2xl font-extrabold tracking-tight text-white">
          NEX<span className="text-cyan-400">FORM</span>
        </span>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <section className="text-center pt-4 pb-8">
          <p className="inline-flex items-center gap-1.5 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Premium Fitness Platform
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Dein Körper.
            <br />
            <span className="text-cyan-400">Dein Plan.</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-4 leading-relaxed max-w-sm mx-auto">
            Training, Ernährung, KI-Coach und Fortschritt — alles in einer App. Wie Hevy &
            MyFitnessPal, nur smarter.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2 mb-8">
          {MOCK_SCREENS.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "rounded-2xl border border-white/10 bg-gradient-to-br p-4 h-28 flex flex-col justify-end",
                s.gradient,
                "animate-[fadeUp_0.5s_ease-out_both]"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="rounded-lg bg-zinc-950/40 h-12 mb-2 border border-white/5" />
              <p className="text-[10px] font-medium text-zinc-300">{s.label}</p>
            </div>
          ))}
        </section>

        <section className="space-y-2 mb-10">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm p-4"
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950/60", f.color)}>
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{f.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 sticky bottom-0 pb-2 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-4 -mx-1 px-1">
          <Link href="/register" className="block">
            <Button className="w-full h-14 text-base rounded-2xl btn-accent font-semibold">
              Registrieren
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full h-14 text-base rounded-2xl border-zinc-700">
              Anmelden
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full h-12 text-sm text-zinc-400"
            disabled={guestLoading}
            onClick={() => void continueAsGuest()}
          >
            {guestLoading ? "Startet…" : "Als Gast fortfahren"}
          </Button>
        </section>
      </main>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
