import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Optional back control rendered above the title. */
  back?: ReactNode;
  className?: string;
};

export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  action,
  back,
  className,
}: Props) {
  return (
    <div className={cn("mb-3", className)}>
      {back ? <div className="mb-1">{back}</div> : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
});
