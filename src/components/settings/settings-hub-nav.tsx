"use client";

import Link from "next/link";
import {
  Bell,
  Watch,
  Bot,
  Lock,
  MessageCircle,
  Shield,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type HubRow = {
  href?: string;
  label: string;
  description?: string;
  value?: string;
  icon: LucideIcon;
  onClick?: () => void;
  danger?: boolean;
};

function Row({
  href,
  label,
  description,
  value,
  icon: Icon,
  onClick,
  danger,
}: HubRow) {
  const className = cn(
    "flex w-full min-h-14 items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
  );
  const inner = (
    <>
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-red-500/10 text-red-300" : "bg-white/[0.06] text-zinc-200"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] font-semibold leading-tight",
            danger ? "text-red-300" : "text-white"
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="block text-[12px] text-zinc-500 mt-0.5 leading-snug">
            {description}
          </span>
        ) : null}
        {value ? (
          <span className="block text-[13px] text-zinc-300 mt-0.5 tabular-nums truncate">
            {value}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href ?? "/settings"} prefetch className={className}>
      {inner}
    </Link>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h2>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden divide-y divide-white/[0.06]">
        {children}
      </div>
    </section>
  );
}

/** Secondary settings below Profil/Ziel overview — no duplicate profile fields. */
export function SettingsHubNav({
  className,
  onLogout,
  loggingOut,
}: {
  className?: string;
  summary?: unknown;
  onLogout?: () => void;
  loggingOut?: boolean;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <Section title="App">
        <Row
          href="/settings?view=notifications"
          label="Benachrichtigungen"
          description="Erinnerungen & Alerts"
          icon={Bell}
        />
        <Row
          href="/geraete"
          label="Geräte"
          description="Wearables & Gesundheit"
          icon={Watch}
        />
        <Row
          href="/coach"
          label="KI Coach"
          description="Tipps und Chat"
          icon={Bot}
        />
        <Row
          href="/settings?view=privacy"
          label="Datenschutz"
          description="Daten & Privatsphäre"
          icon={Lock}
        />
        <Row
          href="/settings/support"
          label="Support"
          description="FAQ, Kontakt, Feedback"
          icon={MessageCircle}
        />
      </Section>

      <Section title="Konto">
        <Row
          href="/settings?view=konto#settings-konto"
          label="Passwort & Sicherheit"
          description="Passwort ändern"
          icon={Shield}
        />
        {onLogout ? (
          <Row
            label={loggingOut ? "Abmelden…" : "Abmelden"}
            description="Session beenden"
            icon={LogOut}
            onClick={onLogout}
            danger
          />
        ) : null}
      </Section>
    </div>
  );
}

/** Kept for type imports used by page.tsx */
export type SettingsHubSummary = {
  personalLine: string;
  bodyLine: string;
  goalLine: string;
  activityLine: string;
  experienceLine: string;
  nutritionLine: string;
  trainingLine: string;
};
