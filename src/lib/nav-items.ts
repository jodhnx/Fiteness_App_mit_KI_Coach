"use client";

import {
  Settings,
  Watch,
  Users,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  Bot,
  Shield,
  Lock,
  LogOut,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/progress", label: "Fortschritt", icon: TrendingUp },
  { href: "/coach", label: "Coach", icon: Bot },
];

/** Profile panel — only two primary settings areas. */
export const PROFILE_MENU_NAV: NavItem[] = [
  { href: "/settings", label: "Einstellungen", icon: Settings },
  { href: "/settings#settings-geraete", label: "Geräte & Gesundheit", icon: Watch },
];

/** Keep Community & Erfolge as existing features. */
export const MORE_NAV: NavItem[] = [
  { href: "/social", label: "Community", icon: Users },
  { href: "/erfolge", label: "Erfolge", icon: Trophy },
];

export const ADMIN_NAV: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
};

export const PRIVACY_NAV: NavItem = {
  href: "/settings#settings-datenschutz",
  label: "Datenschutz",
  icon: Lock,
};

export const LOGOUT_ACTION = {
  label: "Abmelden",
  icon: LogOut,
};
