"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
};

/** Yazio-style fullscreen overlay — covers nav, instant feel */
export function FullscreenPage({
  title,
  subtitle,
  children,
  className,
  onBack,
  rightSlot,
}: Props) {
  const router = useRouter();
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col bg-zinc-950",
        className
      )}
    >
      <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md safe-top">
        <div className="flex items-center gap-2 px-3 py-3 max-w-lg mx-auto w-full">
          <button
            type="button"
            onClick={onBack ?? (() => router.back())}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-300 hover:bg-zinc-800 active:scale-95"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
            )}
          </div>
          {rightSlot}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}
