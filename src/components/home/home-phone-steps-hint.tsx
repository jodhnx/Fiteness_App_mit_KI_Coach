"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { Footprints, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canUsePedometer,
  getPhoneSensorConsent,
  setPhoneSensorConsent,
} from "@/lib/phone-sensors";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";

const DISMISS_KEY = "nexform:phone-hint-dismissed";

function isLikelyIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Honest steps CTA — no fake step counts.
 * Web: phone sensors (Pedometer / DeviceMotion) when permitted.
 * Reliable background steps: Apple Health / Health Connect via Geräte.
 */
export const HomePhoneStepsHint = memo(function HomePhoneStepsHint() {
  const [show, setShow] = useState(false);
  const ios = isLikelyIos();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (getPhoneSensorConsent()?.steps) return;

    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
      allowStale: true,
    });
    const steps = home?.healthToday?.steps ?? 0;
    if (steps > 0) return;

    void fetch("/api/wearables", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const hasWatch = (d?.connections ?? []).some(
          (c: { isActive: boolean }) => c.isActive
        );
        if (!hasWatch) setShow(true);
      })
      .catch(() => setShow(true));
  }, []);

  if (!show) return null;

  const healthLabel = ios ? "Apple Health" : "Health Connect";

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/10 p-3 flex gap-3 items-start">
      <Footprints className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">Schrittzugriff erforderlich</p>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
          Für automatische Schritte verbinde {healthLabel} unter Geräte — oder aktiviere
          die Smartphone-Sensoren (nur während die App geöffnet ist
          {canUsePedometer() ? ", Pedometer verfügbar" : ""}).
        </p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <Link href="/geraete">
            <Button size="sm" variant="premium">
              Schritte verbinden
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPhoneSensorConsent({ steps: true, motion: true, gps: false });
              setShow(false);
              try {
                const DME = DeviceMotionEvent as unknown as {
                  requestPermission?: () => Promise<PermissionState>;
                };
                if (typeof DME.requestPermission === "function") {
                  void DME.requestPermission();
                }
              } catch {
                /* ignore */
              }
              window.dispatchEvent(new Event("storage"));
            }}
          >
            Smartphone aktivieren
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Schließen"
        className="text-zinc-500 p-1"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setShow(false);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});
