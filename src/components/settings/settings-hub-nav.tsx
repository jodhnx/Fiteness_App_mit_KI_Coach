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
  Palette,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";

type HubRow = {
  href?: string;
  label: string;
  description?: string;
  value?: string;
  icon: LucideIcon;
  iconClass?: string;
  onClick?: () => void;
  danger?: boolean;
};

function Row({
  href,
  label,
  description,
  value,
  icon: Icon,
  iconClass,
  onClick,
  danger,
}: HubRow) {
  const className = cn(
    "flex w-full min-h-12 items-center gap-3 px-3.5 py-3 text-left active:bg-zinc-50 dark:active:bg-white/[0.04]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
  );
  const inner = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          danger
            ? "bg-red-500/10 text-red-500"
            : iconClass ?? "bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-200"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] font-medium leading-tight",
            danger ? "text-red-500" : "text-zinc-900 dark:text-white"
          )}
        >
          {label}
        </span>
        {description && !value ? (
          <span className="block text-[12px] text-zinc-500 mt-0.5 leading-snug">
            {description}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="text-[13px] text-zinc-500 tabular-nums truncate max-w-[40%] dark:text-[#8e8e93]">
          {value}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden />
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
    <section className="space-y-1.5">
      <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h2>
      <div className="rounded-[1rem] border border-zinc-200/90 bg-white overflow-hidden divide-y divide-zinc-100 shadow-sm dark:border-white/[0.07] dark:bg-[#1a1a21] dark:divide-white/[0.06] dark:shadow-none">
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
  const prefs = usePreferences();
  const designValue = prefs?.colorMode === "light" ? "Hell" : "Dunkel";

  return (
    <div className={cn("space-y-5", className)}>
      <Section title="App">
        <Row
          href="/settings?view=konto#settings-design"
          label="Design"
          value={designValue}
          icon={Palette}
          iconClass="bg-[var(--accent,#6d5dfe)]/15 text-[var(--accent,#6d5dfe)]"
        />
        <Row
          href="/settings?view=notifications"
          label="Benachrichtigungen"
          value="Ein"
          icon={Bell}
          iconClass="bg-sky-500/15 text-sky-400"
        />
        <Row
          href="/geraete"
          label="Geräte"
          description="Wearables & Gesundheit"
          icon={Watch}
          iconClass="bg-emerald-500/15 text-emerald-400"
        />
        <Row
          href="/coach"
          label="KI Coach"
          description="Tipps und Chat"
          icon={Bot}
          iconClass="bg-teal-500/15 text-teal-400"
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
