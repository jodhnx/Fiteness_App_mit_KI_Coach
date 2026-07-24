"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPhoneSensorConsent,
  setPhoneSensorConsent,
} from "@/lib/phone-sensors";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";

const DISMISS_KEY = "nexform:phone-hint-dismissed";

/** Soft prompt to enable phone steps when no wearable data yet. */
export const HomePhoneStepsHint = memo(function HomePhoneStepsHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (getPhoneSensorConsent()?.steps) return;

    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
    const steps = home?.healthToday?.steps ?? 0;
    if (steps > 0) return;

    // Check wearables lightly
    void fetch("/api/wearables")
      .then((r) => r.json())
      .then((d) => {
        const hasWatch = (d.connections ?? []).some(
          (c: { isActive: boolean }) => c.isActive
        );
        if (!hasWatch) setShow(true);
      })
      .catch(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/10 p-3 flex gap-3 items-start">
      <Smartphone className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">Schritte automatisch zählen?</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          Ohne Smartwatch kann dein Smartphone Schritte und Spaziergänge erfassen.
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="premium"
            onClick={() => {
              setPhoneSensorConsent({ steps: true, motion: true, gps: true });
              setShow(false);
              // iOS motion permission
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
              void fetch("/api/activities/steps", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ steps: 0 }),
              }).catch(() => {});
            }}
          >
            Aktivieren
          </Button>
          <Link href="/geraete">
            <Button size="sm" variant="ghost">
              Geräte
            </Button>
          </Link>
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
