"use client";

import { useEffect } from "react";
import { getPhoneSensorConsent, getPhoneStepsToday } from "@/lib/phone-sensors";

/** Quiet background sync of phone steps when consent is already granted. */
export function PhoneSensorWarmup() {
  useEffect(() => {
    const consent = getPhoneSensorConsent();
    if (!consent?.steps) return;

    const steps = getPhoneStepsToday();
    if (steps.steps <= 0) return;

    void fetch("/api/activities/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ steps: steps.steps }),
    }).catch(() => {});
  }, []);

  return null;
}
