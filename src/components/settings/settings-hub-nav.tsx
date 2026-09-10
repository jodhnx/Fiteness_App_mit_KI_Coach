"use client";

import Link from "next/link";
import {
  User,
  Watch,
  Lock,
  MessageCircle,
  Bell,
  Info,
  ChevronRight,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HubRow = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
};

const HUB_SECTIONS: { title: string; subtitle: string; items: HubRow[] }[] = [
  {
    title: "Profil & Körper",
    subtitle: "Daten aus dem Onboarding bearbeiten",
    items: [
      {
        href: "/settings?view=konto",
        label: "Konto & Ziele",
        description: "Name, Körper, Training, Kalorien, Makros, Wasser",
        icon: User,
      },
      {
        href: "/geraete",
        label: "Geräte & Gesundheit",
        description: "Wearables, Sync, Berechtigungen",
        icon: Watch,
      },
    ],
  },
  {
    title: "App",
    subtitle: "Darstellung und Benachrichtigungen",
    items: [
      {
        href: "/settings?view=konto#settings-design",
        label: "Darstellung",
        description: "Theme, Accent, Dichte",
        icon: Palette,
      },
      {
        href: "/settings?view=notifications",
        label: "Benachrichtigungen",
        icon: Bell,
      },
    ],
  },
  {
    title: "Daten & Support",
    subtitle: "Privatsphäre und Hilfe",
    items: [
      {
        href: "/settings?view=privacy",
        label: "Datenschutz",
        icon: Lock,
      },
      {
        href: "/settings/support",
        label: "Support & Feedback",
        icon: MessageCircle,
      },
      {
        href: "/settings?view=about",
        label: "Über die App",
        icon: Info,
      },
    ],
  },
];

/** Settings landing — premium grouped hub. */
export function SettingsHubNav({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {HUB_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <div className="px-0.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {section.title}
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">{section.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden divide-y divide-white/[0.06]">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className="flex items-center gap-3 px-4 min-h-14 py-3.5 text-left active:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className="block text-[12px] text-zinc-500 mt-0.5 leading-snug">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
