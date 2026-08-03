"use client";

import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";

type MaxWidth = "lg" | "2xl" | "full";

const WIDTH: Record<MaxWidth, string> = {
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  full: "max-w-full",
};

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
  /** Extra bottom padding for bottom nav clearance */
  bottomNav?: boolean;
};

/** Unified page wrapper — consistent spacing, header, and width across all screens. */
export const PageShell = memo(function PageShell({
  children,
  title,
  subtitle,
  action,
  maxWidth = "lg",
  className,
  bottomNav = true,
}: Props) {
  return (
    <div
      className={cn(
        WIDTH[maxWidth],
        "mx-auto space-y-3",
        bottomNav && "pb-4",
        className
      )}
    >
      {title && (
        <PageHeader title={title} subtitle={subtitle} action={action} />
      )}
      {children}
    </div>
  );
});
