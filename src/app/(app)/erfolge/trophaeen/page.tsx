"use client";

import Link from "next/link";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { TrophyRoom } from "@/components/gamification/trophy-room";
import type { GamificationApiPayload } from "@/lib/gamification-defaults";
import { createEmptyGamificationPayload } from "@/lib/gamification-defaults";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TrophaeenPage() {
  const { data: rawData, loading, error, reload } = useCachedFetch<GamificationApiPayload>(
    "gamification-full",
    "/api/gamification",
    90_000,
    25_000
  );

  const data = rawData ?? createEmptyGamificationPayload();

  if (loading && !rawData) {
    return <p className="text-zinc-500 py-12 text-center">Trophäen werden geladen…</p>;
  }

  if (error && !rawData) {
    return (
      <div className="py-12 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
        <p className="text-sm text-zinc-400">{error}</p>
        <Button type="button" variant="outline" onClick={() => reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Erneut laden
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-28">
      <Link
        href="/erfolge"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Erfolge
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Trophäenraum</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {data.unlockedCount} von {data.achievements.length} Erfolgen freigeschaltet
        </p>
      </div>

      <TrophyRoom achievements={data.achievements} />
    </div>
  );
}
