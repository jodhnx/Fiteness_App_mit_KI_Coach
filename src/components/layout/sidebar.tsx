"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  TrendingUp,
  Bot,
  Trophy,
  Users,
  User,
  Shield,
  Watch,
  Target,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/progress", label: "Fortschritt", icon: TrendingUp },
  { href: "/goals", label: "Ziele", icon: Target },
  { href: "/coach", label: "KI Coach", icon: Bot },
  { href: "/erfolge", label: "Erfolge", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
  { href: "/wearables", label: "Wearables", icon: Watch },
  { href: "/profile", label: "Profil", icon: User },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="mb-8 px-2">
        <Link href="/dashboard" className="block">
          <span className="text-2xl font-bold text-white">
            NEX<span className="text-cyan-400">FORM</span>
          </span>
          <span className="text-xs text-zinc-500">Train · Fuel · Rise</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                active
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all mt-4",
              pathname.startsWith("/admin")
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-zinc-400 hover:bg-white/5"
            )}
          >
            <Shield className="h-5 w-5" />
            Admin
          </Link>
        )}
      </nav>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-lg bg-zinc-900 p-2 lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Menü"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/10 bg-zinc-950/95 p-6 backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
