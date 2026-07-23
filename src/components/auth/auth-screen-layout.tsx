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
    <div className="auth-screen-root fixed inset-0 gradient-mesh overflow-hidden">
      <div className="auth-screen-scroll mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] keyboard-stable-page">
        <Link href="/" className="mb-8 inline-block shrink-0 text-xl font-extrabold text-white">
          NEX<span className="text-cyan-400">FORM</span>
        </Link>
        <div className="mb-6 shrink-0">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-3xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-xl">
          {children}
        </div>
        {footer && <div className="mt-6 shrink-0 auth-sticky-actions">{footer}</div>}
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
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

export { Input, Label, Button };
