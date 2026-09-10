"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChevronRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import {
  MORE_HUB_SECTIONS,
  ADMIN_NAV,
  type NavItem,
} from "@/lib/nav-items";
import { hapticTap } from "@/lib/haptic";

function Section({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-2 px-0.5">
        {title}
      </h2>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.06]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            scroll={false}
            onClick={() => hapticTap()}
            className="flex w-full items-center gap-3 px-4 min-h-11 py-3 text-left active:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
          >
            <item.icon className="h-5 w-5 text-zinc-400 shrink-0" />
            <span className="flex-1 min-w-0 text-sm font-medium text-zinc-100">
              {item.label}
            </span>
            <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
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
    <PageShell title="Mehr">
      <div className="space-y-5 pb-2">
        {MORE_HUB_SECTIONS.map((section) => (
          <Section key={section.title} title={section.title} items={section.items} />
        ))}
        {isAdmin && (
          <Section title="Admin" items={[ADMIN_NAV]} />
        )}
      </div>
    </PageShell>
  );
}
