"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const VERSION = "3.0";

/** About the app — static product info + legal deep links. */
export function SettingsAboutPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Über die App</h2>
        <p className="text-sm text-zinc-500 mt-1">NEXFORM — Premium Fitness mit KI-Coach</p>
      </div>

      <dl className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">App</dt>
          <dd className="font-medium text-white mt-0.5">NEXFORM</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Version</dt>
          <dd className="font-medium text-white mt-0.5">{VERSION}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Plattformen</dt>
          <dd className="text-zinc-300 mt-0.5 text-xs leading-relaxed">
            Apple Health · Health Connect · Google Fit · Fitbit · Garmin · Polar · COROS ·
            Samsung · Huawei · Wear OS · Smartphone-Sensoren
          </dd>
        </div>
      </dl>

      <div className="grid gap-2">
        <Link href="/settings?view=privacy" prefetch>
          <Button variant="outline" className="w-full justify-start">
            Datenschutz
          </Button>
        </Link>
        <Link href="/settings/support" prefetch>
          <Button variant="outline" className="w-full justify-start">
            Nutzungsbedingungen / Support
          </Button>
        </Link>
      </div>
    </div>
  );
}
