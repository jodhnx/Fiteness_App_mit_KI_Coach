"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isGuestEmail } from "@/lib/guest-utils";
import { UserPlus } from "lucide-react";

export function GuestUpgradeBanner() {
  const { data: session } = useSession();
  const email = session?.user?.email;

  if (!email || !isGuestEmail(email)) return null;

  return (
    <Link
      href="/register?convert=1"
      className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
    >
      <UserPlus className="h-5 w-5 text-amber-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Gastmodus aktiv</p>
        <p className="text-xs text-zinc-400">Konto erstellen — alle Daten bleiben erhalten</p>
      </div>
      <span className="text-xs text-amber-400 font-medium shrink-0">Jetzt →</span>
    </Link>
  );
}

/** Inline variant for settings */
export function GuestUpgradeCard() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  const router = useRouter();

  if (!email || !isGuestEmail(email)) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="font-semibold text-white">Gastkonto</p>
      <p className="text-sm text-zinc-400 mt-1">
        Erstelle ein Konto, um deine Daten dauerhaft zu speichern und auf allen Geräten zu nutzen.
      </p>
      <button
        type="button"
        className="mt-3 text-sm text-amber-400 font-medium"
        onClick={() => router.push("/register?convert=1")}
      >
        Konto erstellen →
      </button>
    </div>
  );
}
