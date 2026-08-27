"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChevronRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import {
  MORE_HUB_FEATURED,
  MORE_HUB_TRAINING,
  MORE_NAV,
  ADMIN_NAV,
  type NavItem,
} from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";

function HubLink({ item, featured }: { item: NavItem; featured?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      scroll={false}
      onClick={() => hapticTap()}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/60 active:bg-zinc-800/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        featured ? "p-4 min-h-[72px]" : "px-4 py-3.5 min-h-11"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent",
          featured ? "h-11 w-11" : "h-9 w-9"
        )}
      >
        <Icon className={featured ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-zinc-100 text-sm">{item.label}</span>
        {item.description && (
          <span className="block text-xs text-zinc-500 mt-0.5 leading-snug line-clamp-2">
            {item.description}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
    </Link>
  );
}

export default function MorePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    try {
      sessionStorage.setItem("nexform:tab-visited:more", "1");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <PageShell title="Mehr" subtitle="Coach, Pläne und Einstellungen">
      <div className="space-y-6 pb-2">
        <section aria-label="Highlights">
          <div className="grid gap-2">
            {MORE_HUB_FEATURED.map((item) => (
              <HubLink key={item.href} item={item} featured />
            ))}
          </div>
        </section>

        <section aria-label="Training">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-0.5">
            Training & Ernährung
          </h2>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.06]">
            {MORE_HUB_TRAINING.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                scroll={false}
                onClick={() => hapticTap()}
                className="flex w-full items-center gap-3 px-4 py-3.5 min-h-11 text-left active:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
              >
                <item.icon className="h-5 w-5 text-zinc-400 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-zinc-500 truncate">{item.description}</span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Community">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-0.5">
            Community
          </h2>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.06]">
            {MORE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                scroll={false}
                onClick={() => hapticTap()}
                className="flex w-full items-center gap-3 px-4 py-3.5 min-h-11 active:bg-white/[0.04]"
              >
                <item.icon className="h-5 w-5 text-zinc-400 shrink-0" />
                <span className="text-sm font-medium text-zinc-100">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-600 ml-auto shrink-0" aria-hidden />
              </Link>
            ))}
            {isAdmin && (
              <Link
                href={ADMIN_NAV.href}
                prefetch
                className="flex w-full items-center gap-3 px-4 py-3.5 min-h-11 active:bg-white/[0.04]"
              >
                <ADMIN_NAV.icon className="h-5 w-5 text-zinc-400 shrink-0" />
                <span className="text-sm font-medium text-zinc-100">{ADMIN_NAV.label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-600 ml-auto shrink-0" aria-hidden />
              </Link>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
