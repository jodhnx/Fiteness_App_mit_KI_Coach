"use client";

import { useEffect, useState } from "react";
import { getPhoneStepsToday } from "@/lib/phone-sensors";
import { HOME_DATA_EVENT } from "@/lib/nutrition-sync";

let sharedSteps = 0;
const listeners = new Set<(n: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let listenerCount = 0;

function readSteps() {
  try {
    return getPhoneStepsToday().steps ?? 0;
  } catch {
    return 0;
  }
}

function publish() {
  const next = readSteps();
  if (next === sharedSteps) return;
  sharedSteps = next;
  listeners.forEach((cb) => cb(next));
}

function ensureTimer() {
  if (typeof window === "undefined" || timer != null) return;
  sharedSteps = readSteps();
  timer = setInterval(publish, 15_000);
  window.addEventListener("storage", publish);
  window.addEventListener(HOME_DATA_EVENT, publish);
}

function releaseTimer() {
  if (listenerCount > 0 || timer == null) return;
  clearInterval(timer);
  timer = null;
  window.removeEventListener("storage", publish);
  window.removeEventListener(HOME_DATA_EVENT, publish);
}

/** Live phone-step overlay — subscribers re-render independently of Home. */
export function useLivePhoneSteps(serverSteps: number): number {
  const [phoneSteps, setPhoneSteps] = useState(() => {
    if (typeof window === "undefined") return 0;
    return readSteps();
  });

  useEffect(() => {
    listeners.add(setPhoneSteps);
    listenerCount += 1;
    ensureTimer();
    setPhoneSteps(readSteps());
    return () => {
      listeners.delete(setPhoneSteps);
      listenerCount -= 1;
      releaseTimer();
    };
  }, []);

  return Math.max(serverSteps, phoneSteps);
}
