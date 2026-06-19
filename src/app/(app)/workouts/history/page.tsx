"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Historie ist jetzt in Fitness Journey integriert. */
export default function HistoryRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workouts/journey");
  }, [router]);
  return null;
}
