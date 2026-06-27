import { memo, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  glow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

/** Glassmorphism card — unified premium surface across the app. */
export const PremiumCard = memo(function PremiumCard({
  children,
  className,
  glow = false,
  padding = "md",
  ...props
}: Props) {
  return (
    <div
      className={cn(
        "card-premium",
        PADDING[padding],
        glow && "premium-glow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
