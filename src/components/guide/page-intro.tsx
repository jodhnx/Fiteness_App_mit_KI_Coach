"use client";

import { memo, useEffect, useState } from "react";
import { X, Lightbulb } from "lucide-react";
import {
  PAGE_INTROS,
  hasSeenGuide,
  markGuideSeen,
  type GuidePageId,
} from "@/lib/feature-guide";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { hapticTap } from "@/lib/haptic";

/** Dismissible first-visit intro for each main page. */
export const PageIntro = memo(function PageIntro({ pageId }: { pageId: GuidePageId }) {
  const [show, setShow] = useState(false);
  const intro = PAGE_INTROS[pageId];

  useEffect(() => {
    if (!intro) return;
    if (!hasSeenGuide(`page:${pageId}`)) setShow(true);
  }, [pageId, intro]);

  if (!show || !intro) return null;

  return (
    <PremiumCard className="relative border-accent/20 bg-accent/5 animate-in-fade">
      <button
        type="button"
        aria-label="Schließen"
        className="absolute top-3 right-3 text-zinc-500 p-1"
        onClick={() => {
          hapticTap();
          markGuideSeen(`page:${pageId}`);
          setShow(false);
        }}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <Lightbulb className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm">{intro.title}</p>
          <p className="text-xs text-zinc-400 mt-1">{intro.body}</p>
          <ul className="mt-2 space-y-1">
            {intro.tips.map((t) => (
              <li key={t} className="text-xs text-zinc-300 flex gap-1.5">
                <span className="text-accent">·</span>
                {t}
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="premium"
            className="mt-3"
            onClick={() => {
              hapticTap();
              markGuideSeen(`page:${pageId}`);
              setShow(false);
            }}
          >
            Verstanden
          </Button>
        </div>
      </div>
    </PremiumCard>
  );
});
