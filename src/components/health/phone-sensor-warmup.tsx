"use client";

import { useEffect, useState } from "react";
import { usePhoneSensors } from "@/hooks/use-phone-sensors";
import {
  canUsePedometer,
  getPhoneSensorConsent,
  getPhoneStepsToday,
  setPhoneSensorConsent,
} from "@/lib/phone-sensors";

function syncLocalStepsIfAny() {
  const steps = getPhoneStepsToday();
  if (steps.steps <= 0) return;
  void fetch("/api/activities/steps", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ steps: steps.steps }),
  }).catch(() => {});
}

/**
 * Keeps phone step tracking alive app-wide when consent is granted.
 * Soft-enables pedometer when API is available. Syncs on resume.
 * Never invents step values.
 */
export function PhoneSensorWarmup() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
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
    syncLocalStepsIfAny();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") syncLocalStepsIfAny();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled]);

  return null;
}
