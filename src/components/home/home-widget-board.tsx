"use client";

import { memo, useCallback, useState, type ReactNode } from "react";
import { Settings2, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import {
  loadHomeWidgets,
  saveHomeWidgets,
  moveWidget,
  type HomeWidgetConfig,
  type HomeWidgetId,
} from "@/lib/home-widgets";
import { Button } from "@/components/ui/button";
import { hapticTap } from "@/lib/haptic";
import { cn } from "@/lib/utils";

type SlotMap = Partial<Record<HomeWidgetId, ReactNode>>;

/** Renders home sections in user-defined order with show/hide + reorder. */
export const HomeWidgetBoard = memo(function HomeWidgetBoard({
  slots,
  pinFirst,
}: {
  slots: SlotMap;
  /** Keep this widget first and visible (e.g. live workout). */
  pinFirst?: HomeWidgetId | null;
}) {
  const [widgets, setWidgets] = useState<HomeWidgetConfig[]>(() => loadHomeWidgets());
  const [edit, setEdit] = useState(false);

  const displayWidgets =
    !edit && pinFirst
      ? (() => {
          const pinned = widgets.find((w) => w.id === pinFirst);
          if (!pinned) return widgets;
          return [{ ...pinned, visible: true }, ...widgets.filter((w) => w.id !== pinFirst)];
        })()
      : widgets;

  const persist = useCallback((next: HomeWidgetConfig[]) => {
    setWidgets(next);
    saveHomeWidgets(next);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-zinc-400 h-11 w-11"
          aria-label={edit ? "Widget-Bearbeitung beenden" : "Widgets anordnen"}
          aria-pressed={edit}
          onClick={() => {
            hapticTap();
            setEdit((e) => !e);
          }}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {displayWidgets.map((w) => {
        const content = slots[w.id];
        if (!content) return null;
        if (!w.visible && !edit) return null;

        return (
          <div
            key={w.id}
            className={cn(
              "relative",
              !w.visible && edit && "opacity-40",
              edit && "rounded-2xl ring-1 ring-white/10 p-1"
            )}
          >
            {edit && (
              <div className="flex items-center justify-between gap-2 mb-1 px-1">
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {w.label}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300"
                    aria-label="Nach oben"
                    onClick={() => {
                      hapticTap();
                      persist(moveWidget(widgets, w.id, -1));
                    }}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300"
                    aria-label="Nach unten"
                    onClick={() => {
                      hapticTap();
                      persist(moveWidget(widgets, w.id, 1));
                    }}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300"
                    aria-label={w.visible ? "Ausblenden" : "Einblenden"}
                    onClick={() => {
                      hapticTap();
                      persist(
                        widgets.map((x) =>
                          x.id === w.id ? { ...x, visible: !x.visible } : x
                        )
                      );
                    }}
                  >
                    {w.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {content}
          </div>
        );
      })}
    </div>
  );
});
