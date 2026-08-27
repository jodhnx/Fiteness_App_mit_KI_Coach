"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Lightweight confirm dialog — matches app modal style. */
export const ConfirmDialog = memo(function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-white">
          {title}
        </h2>
        <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{description}</p>
        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={cn(
              "min-h-11",
              destructive && "bg-red-600 hover:bg-red-500 text-white"
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
});
