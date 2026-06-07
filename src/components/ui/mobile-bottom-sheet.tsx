"use client";

import { memo, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** full = search sheet (~88dvh), compact = product detail (~auto) */
  variant?: "full" | "compact";
  /** Stack above another sheet */
  layer?: "base" | "detail";
  showHandle?: boolean;
  headerAction?: ReactNode;
  bodyClassName?: string;
};

const LAYER_Z = { base: 200, detail: 210 } as const;

export const MobileBottomSheet = memo(function MobileBottomSheet({
  open,
  onClose,
  children,
  title,
  subtitle,
  variant = "full",
  layer = "base",
  showHandle = true,
  headerAction,
  bodyClassName,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.mobileSheet = layer;
    return () => {
      document.body.style.overflow = prev;
      if (document.body.dataset.mobileSheet === layer) {
        delete document.body.dataset.mobileSheet;
      }
    };
  }, [open, layer]);

  if (!mounted || !open) return null;

  const z = LAYER_Z[layer];

  return createPortal(
    <div
      className="mobile-sheet-root"
      style={{ zIndex: z }}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
    >
      <button
        type="button"
        className="mobile-sheet-backdrop"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div
        className={cn(
          "mobile-sheet-panel",
          variant === "compact" && "mobile-sheet-panel--compact",
          variant === "full" && "mobile-sheet-panel--full"
        )}
      >
        {showHandle && (
          <div className="mobile-sheet-handle-wrap" aria-hidden>
            <div className="mobile-sheet-handle" />
          </div>
        )}

        {(title || subtitle || headerAction) && (
          <header className="mobile-sheet-header shrink-0">
            <div className="min-w-0 flex-1">
              {subtitle && (
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                  {subtitle}
                </p>
              )}
              {title && (
                <h2 className="text-lg font-bold text-white leading-tight truncate">
                  {title}
                </h2>
              )}
            </div>
            {headerAction ?? (
              <button
                type="button"
                onClick={onClose}
                className="mobile-sheet-close-btn"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </header>
        )}

        <div className={cn("mobile-sheet-body", bodyClassName)}>{children}</div>
      </div>
    </div>,
    document.body
  );
});
