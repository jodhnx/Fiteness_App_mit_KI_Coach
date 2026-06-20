"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { startGuestSession } from "@/lib/guest-client";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthScreenLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="gradient-mesh min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link href="/" className="text-xl font-extrabold text-white mb-8 inline-block">
          NEX<span className="text-cyan-400">FORM</span>
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl p-5 flex-1">
          {children}
        </div>
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}

export function GuestContinueButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("w-full h-12 text-zinc-400", className)}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const r = await startGuestSession();
        setLoading(false);
        if (!r.ok) {
          toast.error(r.error ?? "Fehler");
          return;
        }
        toast.success("Als Gast angemeldet");
        router.replace("/home");
      }}
    >
      <Zap className="h-4 w-4 mr-2 text-amber-400" />
      {loading ? "Startet…" : "Als Gast fortfahren"}
    </Button>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  const pct = score <= 2 ? 33 : score <= 3 ? 66 : 100;
  const label = score <= 2 ? "Schwach" : score <= 3 ? "Mittel" : "Stark";
  const color = score <= 2 ? "bg-red-500" : score <= 3 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-2">
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

export { Input, Label, Button };
