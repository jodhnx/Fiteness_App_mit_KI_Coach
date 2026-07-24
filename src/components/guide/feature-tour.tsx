"use client";

import { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  isFeatureTourDone,
  markFeatureTourDone,
} from "@/lib/feature-guide";
import { hapticSelect } from "@/lib/haptic";
import {
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  Bot,
  Watch,
  ChevronRight,
} from "lucide-react";

const STEPS = [
  {
    icon: Home,
    title: "Home",
    body: "Dein Tages-Dashboard — Kalorien, Schritte, Training und Tipps.",
    href: "/home",
  },
  {
    icon: Dumbbell,
    title: "Training",
    body: "Pläne starten, Sätze tracken und Rekorde knacken.",
    href: "/workouts",
  },
  {
    icon: Apple,
    title: "Ernährung",
    body: "Mahlzeiten in Sekunden loggen — Makros aktualisieren live.",
    href: "/nutrition",
  },
  {
    icon: TrendingUp,
    title: "Fortschritt",
    body: "Gewicht, Fotos und Kraftentwicklung im Blick.",
    href: "/progress",
  },
  {
    icon: Bot,
    title: "KI-Coach",
    body: "Persönliche Analysen und Empfehlungen basierend auf deinen Daten.",
    href: "/coach",
  },
  {
    icon: Watch,
    title: "Geräte",
    body: "Watch verbinden oder Smartphone-Sensoren für automatische Schritte.",
    href: "/geraete",
  },
] as const;

/** Interactive first-start tour overlay — additive, skippable. */
export const FeatureTour = memo(function FeatureTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isFeatureTourDone()) return;
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const last = step >= STEPS.length - 1;

  function finish() {
    markFeatureTourDone();
    hapticSelect();
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Tour schließen"
        onClick={finish}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 glass-panel p-6 shadow-2xl animate-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Tour {step + 1}/{STEPS.length}
            </p>
            <h2 className="text-lg font-bold text-white">{current.title}</h2>
          </div>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{current.body}</p>

        <div className="flex gap-1.5 mt-5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-accent" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={finish}>
            Überspringen
          </Button>
          {!last ? (
            <Button
              variant="premium"
              className="flex-1"
              onClick={() => {
                hapticSelect();
                setStep((s) => s + 1);
              }}
            >
              Weiter <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="premium"
              className="flex-1"
              onClick={() => {
                finish();
                router.push("/home");
              }}
            >
              Los geht&apos;s
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
