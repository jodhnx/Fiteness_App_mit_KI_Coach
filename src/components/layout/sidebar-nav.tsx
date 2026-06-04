"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useState, useCallback } from "react";
import {
  Home,
  Dumbbell,
  Apple,
  Footprints,
  Bot,
  User,
  Shield,
  Menu,
  X,
  TrendingUp,
  Target,
  Settings,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/activities", label: "Aktivitäten", icon: Footprints },
  { href: "/coach", label: "KI Coach", icon: Bot },
  { href: "/profile", label: "Profil", icon: User },
] as const;

const SECONDARY_NAV = [
  { href: "/erfolge", label: "Erfolge", icon: Trophy },
  { href: "/settings", label: "Einstellungen", icon: Settings },
  { href: "/progress", label: "Fortschritt", icon: TrendingUp },
  { href: "/goals", label: "Ziele", icon: Target },
] as const;

const NavLink = memo(function NavLink({
  href,
  label,
  active,
  onNavigate,
  Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
  Icon: typeof Home;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-100",
        active
          ? "bg-accent-soft text-accent"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
});

export const SidebarNav = memo(function SidebarNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/home" && pathname === "/dashboard");

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-xl bg-zinc-900/90 border border-white/10 p-2 lg:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menü"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={close} />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/10 bg-zinc-950/98 p-5 backdrop-blur-xl transition-transform duration-150 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-6 px-1">
          <Link href="/home" prefetch className="block" onClick={close}>
            <span className="text-xl font-bold text-white tracking-tight">
              AI<span className="text-cyan-400">Coach</span>
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              Fitness · Ernährung · Ausdauer
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={isActive(item.href)}
              onNavigate={close}
            />
          ))}
          <div className="my-3 border-t border-white/10" />
          <p className="px-4 text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Mehr</p>
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={isActive(item.href)}
              onNavigate={close}
            />
          ))}
          {isAdmin && (
            <NavLink
              href="/admin"
              label="Admin"
              Icon={Shield}
              active={pathname.startsWith("/admin")}
              onNavigate={close}
            />
          )}
        </nav>
      </aside>
    </>
  );
});
