"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canUseDeviceMotion,
  canUseGeolocation,
  canUsePedometer,
  clearGpsSession,
  estimateCaloriesFromDistance,
  getGpsSession,
  getPhoneSensorConsent,
  getPhoneStepsToday,
  markPhoneStepsSynced,
  setPhoneSensorConsent,
  setPhoneStepsToday,
  startGpsSession,
  updateGpsSession,
  type GpsSession,
  type PhoneSensorConsent,
  type PhoneStepsState,
} from "@/lib/phone-sensors";

type PedometerLike = {
  start: (opts: { frequency?: number }) => void;
  stop: () => void;
  onreading: ((this: PedometerLike) => void) | null;
  onerror: ((this: PedometerLike, ev: Event) => void) | null;
  stepCount?: number;
};

declare global {
  interface Window {
    Pedometer?: new () => PedometerLike;
  }
}

async function syncStepsToServer(steps: number) {
  try {
    const res = await fetch("/api/activities/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ steps }),
    });
    if (res.ok) markPhoneStepsSynced(steps);
  } catch {
    /* offline — retry later */
  }
}

/**
 * Phone sensor fallback: pedometer / motion estimation + GPS walks.
 * Syncs steps to /api/activities/steps when consent is granted.
 */
export function usePhoneSensors(enabled = true) {
  const [consent, setConsent] = useState<PhoneSensorConsent | null>(null);
  const [steps, setSteps] = useState<PhoneStepsState>(() =>
    typeof window !== "undefined"
      ? getPhoneStepsToday()
      : { date: "", steps: 0, source: "estimated", lastSyncAt: null }
  );
  const [gpsSession, setGpsSession] = useState<GpsSession | null>(null);
  const [supported, setSupported] = useState({
    pedometer: false,
    motion: false,
    gps: false,
  });
  const pedometerRef = useRef<PedometerLike | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const motionStepsRef = useRef(0);
  const lastAccelRef = useRef(0);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setConsent(getPhoneSensorConsent());
    setSteps(getPhoneStepsToday());
    setGpsSession(getGpsSession());
    setSupported({
      pedometer: canUsePedometer(),
      motion: canUseDeviceMotion(),
      gps: canUseGeolocation(),
    });
  }, []);

  const grantConsent = useCallback(
    (opts: { steps?: boolean; motion?: boolean; gps?: boolean }) => {
      const next = setPhoneSensorConsent({
        steps: opts.steps ?? true,
        motion: opts.motion ?? true,
        gps: opts.gps ?? true,
      });
      setConsent(next);
      return next;
    },
    []
  );

  const revokeConsent = useCallback(() => {
    localStorage.removeItem("nexform:phone-sensors-consent");
    setConsent(null);
    if (pedometerRef.current) {
      try {
        pedometerRef.current.stop();
      } catch {
        /* ignore */
      }
      pedometerRef.current = null;
    }
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Pedometer / motion tracking
  useEffect(() => {
    if (!enabled || !consent?.steps) return;

    let cancelled = false;

    async function startPedometer() {
      if (!window.Pedometer) return false;
      try {
        const ped = new window.Pedometer();
        ped.onreading = function () {
          if (cancelled) return;
          const count = Math.round(this.stepCount ?? 0);
          if (count > 0) {
            const state = setPhoneStepsToday(count, "pedometer");
            setSteps(state);
          }
        };
        ped.start({ frequency: 1 });
        pedometerRef.current = ped;
        return true;
      } catch {
        return false;
      }
    }

    function startMotionEstimate() {
      if (!consent?.motion || !canUseDeviceMotion()) return;

      const onMotion = (e: DeviceMotionEvent) => {
        const a = e.accelerationIncludingGravity;
        if (!a || a.x == null || a.y == null || a.z == null) return;
        const mag = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
        const delta = Math.abs(mag - lastAccelRef.current);
        lastAccelRef.current = mag;
        // Simple peak detection — approximate step
        if (delta > 1.8) {
          motionStepsRef.current += 1;
          if (motionStepsRef.current % 5 === 0) {
            const base = getPhoneStepsToday();
            if (base.source === "pedometer") return;
            const next = setPhoneStepsToday(
              Math.max(base.steps, Math.floor(motionStepsRef.current / 2)),
              "estimated"
            );
            setSteps(next);
          }
        }
      };

      window.addEventListener("devicemotion", onMotion);
      return () => window.removeEventListener("devicemotion", onMotion);
    }

    let cleanupMotion: (() => void) | undefined;

    void (async () => {
      const ok = await startPedometer();
      if (!ok && !cancelled) {
        cleanupMotion = startMotionEstimate();
      }
    })();

    syncTimerRef.current = setInterval(() => {
      const s = getPhoneStepsToday();
      if (s.steps > 0) void syncStepsToServer(s.steps);
    }, 60_000);

    // Initial sync
    const initial = getPhoneStepsToday();
    if (initial.steps > 0) void syncStepsToServer(initial.steps);

    return () => {
      cancelled = true;
      if (pedometerRef.current) {
        try {
          pedometerRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      cleanupMotion?.();
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [enabled, consent?.steps, consent?.motion]);

  const startWalk = useCallback(
    (type: "WALKING" | "RUNNING" = "WALKING") => {
      if (!consent?.gps || !canUseGeolocation()) return null;
      const session = startGpsSession(type);
      setGpsSession(session);

      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const updated = updateGpsSession({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            t: Date.now(),
          });
          if (updated) setGpsSession({ ...updated });
        },
        () => {
          /* permission denied / unavailable */
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );

      return session;
    },
    [consent?.gps]
  );

  const stopWalk = useCallback(async () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    const session = getGpsSession();
    if (!session || session.points.length < 2) {
      clearGpsSession();
      setGpsSession(null);
      return null;
    }

    const durationSec = Math.max(
      1,
      Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)
    );
    const calories = estimateCaloriesFromDistance(session.distanceM);

    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: session.type,
          startedAt: session.startedAt,
          durationSec,
          distanceM: Math.round(session.distanceM),
          caloriesBurned: calories,
          notes: "Smartphone GPS",
        }),
      });
    } catch {
      /* offline */
    }

    clearGpsSession();
    setGpsSession(null);
    return { ...session, durationSec, calories };
  }, []);

  const syncNow = useCallback(async () => {
    const s = getPhoneStepsToday();
    if (s.steps > 0) await syncStepsToServer(s.steps);
    setSteps(getPhoneStepsToday());
  }, []);

  return {
    consent,
    steps,
    gpsSession,
    supported,
    grantConsent,
    revokeConsent,
    startWalk,
    stopWalk,
    syncNow,
    hasConsent: Boolean(consent?.steps || consent?.gps),
  };
}
