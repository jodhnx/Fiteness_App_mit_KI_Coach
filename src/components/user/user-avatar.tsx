"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: { box: "h-9 w-9", text: "text-xs" },
  md: { box: "h-12 w-12", text: "text-sm" },
  lg: { box: "h-20 w-20", text: "text-xl" },
  xl: { box: "h-14 w-14", text: "text-base" },
};

function initials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function UserAvatar({ src, name, size = "md", className }: Props) {
  const s = sizes[size];
  const cleanSrc = src?.split("?")[0];

  if (cleanSrc) {
    return (
      <div
        className={cn(
          s.box,
          "relative rounded-full overflow-hidden shrink-0 border border-white/10 bg-zinc-800",
          className
        )}
      >
        <Image
          src={src!}
          alt={name ?? "Profilbild"}
          fill
          className="object-cover"
          sizes={
            size === "lg" ? "80px" : size === "xl" ? "56px" : size === "md" ? "48px" : "36px"
          }
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        s.box,
        "rounded-full shrink-0 flex items-center justify-center font-semibold bg-accent-soft text-accent border border-accent/30",
        s.text,
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
