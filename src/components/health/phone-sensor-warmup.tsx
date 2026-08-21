"use client";

import { useEffect, useState } from "react";
import { usePhoneSensors } from "@/hooks/use-phone-sensors";
import {
  canUsePedometer,
  getPhoneSensorConsent,
  getPhoneStepsToday,
  setPhoneSensorConsent,
} from "@/lib/phone-sensors";

/**
 * Keeps phone step tracking alive app-wide when consent is granted
 * (fallback when no smartwatch is connected).
 * Soft-enables pedometer automatically when the API is available.
 */
export function PhoneSensorWarmup() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Prefer native pedometer automatically (not GPS-only).
    if (!getPhoneSensorConsent() && canUsePedometer()) {
      setPhoneSensorConsent({ steps: true, motion: true, gps: false });
    }
    setEnabled(!!getPhoneSensorConsent()?.steps);
    const onStorage = () => setEnabled(!!getPhoneSensorConsent()?.steps);
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(onStorage, 4000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  usePhoneSensors(enabled);

  useEffect(() => {
    if (!enabled) return;
    const steps = getPhoneStepsToday();
    if (steps.steps <= 0) return;

    void fetch("/api/activities/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ steps: steps.steps }),
    }).catch(() => {});
  }, [enabled]);

  return null;
}
