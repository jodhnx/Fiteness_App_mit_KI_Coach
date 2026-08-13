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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HUB_PRIMARY: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "#settings-konto",
    label: "Konto",
    description: "Persönliche Daten, E-Mail, Körperdaten, Ziele, Abmelden",
    icon: User,
  },
  {
    href: "#settings-geraete",
    label: "Geräte & Gesundheit",
    description: "Apple Health, Health Connect, Smartwatch, Sync",
    icon: Watch,
  },
];

const HUB_SECONDARY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "#settings-datenschutz", label: "Datenschutz", icon: Lock },
  { href: "/settings/support", label: "Support & Feedback", icon: MessageCircle },
  { href: "#settings-benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { href: "#settings-app", label: "Über die App", icon: Info },
];

function scrollToHash(hash: string) {
  if (!hash.startsWith("#")) return;
  const el = document.getElementById(hash.slice(1));
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Clean settings landing — two primary areas + compact secondary links. */
export function SettingsHubNav({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-2">
        {HUB_PRIMARY.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToHash(item.href);
              }}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-4 active:bg-zinc-800/80"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">{item.label}</span>
                <span className="block text-xs text-zinc-500 mt-0.5 leading-snug">
                  {item.description}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
            </a>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.06]">
        {HUB_SECONDARY.map((item) => {
          const Icon = item.icon;
          const isRoute = item.href.startsWith("/");
          const className =
            "flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04]";
          const inner = (
            <>
              <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
              <span className="flex-1 text-sm font-medium text-zinc-200">{item.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
            </>
          );
          if (isRoute) {
            return (
              <Link key={item.href} href={item.href} prefetch className={className}>
                {inner}
              </Link>
            );
          }
          return (
            <a
              key={item.href}
              href={item.href}
              className={className}
              onClick={(e) => {
                e.preventDefault();
                scrollToHash(item.href);
              }}
            >
              {inner}
            </a>
          );
        })}
      </div>
    </div>
  );
}
