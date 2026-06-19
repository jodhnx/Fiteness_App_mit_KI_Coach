"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Gym Check-in ist jetzt in Fitness Journey integriert. */
export default function AnalyticsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workouts/journey");
  }, [router]);
  return null;
}
