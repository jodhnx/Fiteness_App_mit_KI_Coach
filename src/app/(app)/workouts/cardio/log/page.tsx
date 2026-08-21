"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CARDIO_CATALOG,
  getCardioById,
  buildCardioNotes,
  type CardioIntensity,
} from "@/lib/cardio/cardio-types";
import { estimateCardioCalories } from "@/lib/cardio/estimate-calories";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { toast } from "sonner";
import { invalidateCache } from "@/lib/client-cache";
import {
  HOME_DATA_EVENT,
  NUTRITION_DASHBOARD_CACHE_KEY,
  publishNutritionDashboard,
} from "@/lib/nutrition-sync";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

function CardioLogInner() {
  const router = useRouter();
  const params = useSearchParams();
  const typeId = params.get("type") ?? "running";
  const item = getCardioById(typeId) ?? CARDIO_CATALOG[1]!;

  const { data: profileData } = useCachedFetch<{
    profile?: { weightKg?: number | null };
  }>("profile", "/api/profile", 120_000, 8_000, {
    revalidateOnMount: false,
    staleRatio: 0.95,
  });

  const [durationMin, setDurationMin] = useState("30");
  const [distanceKm, setDistanceKm] = useState("");
  const [intensity, setIntensity] = useState<CardioIntensity>("MODERATE");
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);

  const estimate = useMemo(() => {
    const mins = Number(durationMin) || 0;
    const catalogItem =
      item.id === "custom" && customName.trim()
        ? { ...item, label: customName.trim(), customLabel: customName.trim() }
        : item;
    return estimateCardioCalories({
      item: catalogItem,
      durationMin: mins,
      intensity,
      weightKg: profileData?.profile?.weightKg,
    });
  }, [durationMin, intensity, item, customName, profileData?.profile?.weightKg]);

  const save = async () => {
    const mins = Number(durationMin);
    if (!mins || mins < 1 || mins > 600) {
      toast.error("Dauer zwischen 1 und 600 Minuten");
      return;
    }
    const distKm = distanceKm.trim() ? Number(distanceKm.replace(",", ".")) : NaN;
    setSaving(true);
    try {
      const catalogItem =
        item.id === "custom" && customName.trim()
          ? { ...item, label: customName.trim(), customLabel: customName.trim() }
          : item;
      const res = await fetch("/api/activities", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: catalogItem.type,
          durationSec: Math.round(mins * 60),
          distanceM:
            Number.isFinite(distKm) && distKm > 0
              ? Math.round(distKm * 1000)
              : undefined,
          caloriesBurned: estimate.calories,
          notes: buildCardioNotes(catalogItem, intensity),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Speichern fehlgeschlagen");
        return;
      }
      invalidateCache("cardio-activities");
      invalidateCache(NUTRITION_DASHBOARD_CACHE_KEY);
      invalidateCache("home");
      try {
        const dashRes = await fetch("/api/nutrition/dashboard", {
          credentials: "same-origin",
        });
        if (dashRes.ok) {
          const dash = await dashRes.json();
          publishNutritionDashboard(dash);
        }
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(HOME_DATA_EVENT));
      toast.success("Cardio gespeichert");
      router.replace("/workouts/cardio");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title={`${item.emoji} ${item.label}`}
      className="space-y-5 pb-28"
      bottomNav={false}
      action={
        <button
          type="button"
          onClick={() => router.push("/workouts/cardio")}
          className="h-10 w-10 rounded-2xl border border-zinc-700 bg-zinc-900/80 flex items-center justify-center text-zinc-200"
          aria-label="Zurück zu Cardio"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      }
    >
      <button
        type="button"
        onClick={() => router.push("/workouts/cardio")}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent -mt-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Cardio
      </button>

      {item.id === "custom" && (
        <div>
          <Label>Bezeichnung</Label>
          <Input
            className="mt-1.5 h-12"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="z. B. Seilspringen"
          />
        </div>
      )}

      <div>
        <Label>Dauer (Minuten)</Label>
        <Input
          className="mt-1.5 h-12 text-lg tabular-nums"
          inputMode="numeric"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="45"
        />
      </div>

      <div>
        <Label>Distanz (km, optional)</Label>
        <Input
          className="mt-1.5 h-12 text-lg tabular-nums"
          inputMode="decimal"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="z. B. 8"
        />
      </div>

      <div>
        <Label>Intensität</Label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {(
            [
              { id: "LOW", label: "Leicht" },
              { id: "MODERATE", label: "Moderat" },
              { id: "HIGH", label: "Hoch" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setIntensity(opt.id)}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition-colors",
                intensity === opt.id
                  ? "border-accent/50 bg-accent/15 text-white"
                  : "border-zinc-700 bg-zinc-900/60 text-zinc-400"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-orange-500/25 bg-orange-500/10 p-4 space-y-1">
        <p className="text-[11px] uppercase tracking-widest text-orange-300/80 font-semibold">
          {estimate.label}
        </p>
        <p className="text-3xl font-bold text-white tabular-nums">
          ≈ {estimate.calories}{" "}
          <span className="text-base font-medium text-zinc-400">kcal</span>
        </p>
        <p className="text-xs text-zinc-500">
          Basierend auf{" "}
          {profileData?.profile?.weightKg
            ? `${profileData.profile.weightKg} kg Körpergewicht`
            : "Standardgewicht"}{" "}
          · MET {estimate.met.toFixed(1)}
          {distanceKm ? ` · ${distanceKm} km` : ""}
        </p>
      </div>

      <Button
        className="w-full h-12 rounded-2xl text-base"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Speichern…" : "Cardio speichern"}
      </Button>
    </PageShell>
  );
}

export default function CardioLogPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Cardio" className="pb-24" bottomNav={false}>
          <p className="text-sm text-zinc-500">Laden…</p>
        </PageShell>
      }
    >
      <CardioLogInner />
    </Suspense>
  );
}
