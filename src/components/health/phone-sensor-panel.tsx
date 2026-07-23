"use client";

import { memo, useState } from "react";
import {
  Smartphone,
  Footprints,
  MapPin,
  Activity,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { usePhoneSensors } from "@/hooks/use-phone-sensors";
import { estimateSpeedKmh } from "@/lib/phone-sensors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Phone sensor fallback when no smartwatch is connected. */
export const PhoneSensorPanel = memo(function PhoneSensorPanel({
  hasWearable = false,
}: {
  hasWearable?: boolean;
}) {
  const {
    steps,
    gpsSession,
    supported,
    grantConsent,
    revokeConsent,
    startWalk,
    stopWalk,
    syncNow,
    hasConsent,
  } = usePhoneSensors(true);
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    try {
      if (supported.motion && typeof DeviceMotionEvent !== "undefined") {
        const DME = DeviceMotionEvent as unknown as {
          requestPermission?: () => Promise<PermissionState>;
        };
        if (typeof DME.requestPermission === "function") {
          await DME.requestPermission();
        }
      }
      grantConsent({ steps: true, motion: true, gps: true });
      toast.success("Smartphone-Sensoren aktiviert");
    } catch {
      grantConsent({ steps: true, motion: true, gps: true });
      toast.success("Sensoren aktiviert (eingeschränkt)");
    } finally {
      setBusy(false);
    }
  }

  async function onStopWalk() {
    setBusy(true);
    const result = await stopWalk();
    setBusy(false);
    if (result) {
      toast.success(
        `Aktivität gespeichert · ${Math.round(result.distanceM)} m · ${result.calories} kcal`
      );
    } else {
      toast.message("Zu wenig GPS-Punkte — nicht gespeichert");
    }
  }

  const durationSec = gpsSession
    ? Math.round((Date.now() - new Date(gpsSession.startedAt).getTime()) / 1000)
    : 0;

  return (
    <PremiumCard className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white">Smartphone als Sensor</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {hasWearable
              ? "Zusätzlich zur Smartwatch — Schritte & GPS vom Handy"
              : "Keine Smartwatch? Nutze Schrittzähler, Bewegungssensor und GPS deines Smartphones."}
          </p>
        </div>
      </div>

      {!hasConsent ? (
        <Button
          variant="premium"
          className="w-full"
          disabled={busy}
          onClick={() => void enable()}
        >
          Mit Zustimmung aktivieren
        </Button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
              <Footprints className="h-4 w-4 text-cyan-400 mx-auto" />
              <p className="text-lg font-bold text-white tabular-nums mt-1">
                {steps.steps.toLocaleString("de-DE")}
              </p>
              <p className="text-[9px] text-zinc-500">Schritte</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
              <Activity className="h-4 w-4 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-white mt-1 capitalize">
                {steps.source === "pedometer" ? "Sensor" : "Schätzung"}
              </p>
              <p className="text-[9px] text-zinc-500">Quelle</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
              <MapPin className="h-4 w-4 text-violet-400 mx-auto" />
              <p className="text-sm font-bold text-white mt-1">
                {supported.gps ? "Bereit" : "N/A"}
              </p>
              <p className="text-[9px] text-zinc-500">GPS</p>
            </div>
          </div>

          {gpsSession ? (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3 space-y-2">
              <p className="text-sm text-cyan-200 font-medium">
                {gpsSession.type === "RUNNING" ? "Lauf" : "Spaziergang"} aktiv
              </p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {Math.round(gpsSession.distanceM)} m
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  {Math.floor(durationSec / 60)}:
                  {String(durationSec % 60).padStart(2, "0")} ·{" "}
                  {estimateSpeedKmh(gpsSession.distanceM, durationSec)} km/h
                </span>
              </p>
              <Button
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() => void onStopWalk()}
              >
                <Square className="h-4 w-4 mr-1" /> Beenden & speichern
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  startWalk("WALKING");
                  toast.message("Spaziergang gestartet");
                }}
              >
                <Play className="h-4 w-4 mr-1" /> Gehen
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  startWalk("RUNNING");
                  toast.message("Lauf gestartet");
                }}
              >
                <Play className="h-4 w-4 mr-1" /> Laufen
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => void syncNow()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 text-zinc-500")}
              onClick={() => {
                revokeConsent();
                toast.message("Sensoren deaktiviert");
              }}
            >
              Deaktivieren
            </Button>
          </div>
        </>
      )}
    </PremiumCard>
  );
});
