"use client";

import {
  Settings,
  Watch,
  Users,
  Trophy,
  CookingPot,
  Bot,
  FolderOpen,
  Medal,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import {
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  LayoutGrid,
  Shield,
  Lock,
  LogOut,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

/** Bottom tab bar — max 5 main tabs (mobile). */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/progress", label: "Fortschritt", icon: TrendingUp },
  { href: "/more", label: "Mehr", icon: LayoutGrid },
];

/** Routes that keep the More tab highlighted (hub + secondary destinations). */
export const MORE_TAB_ROUTES = [
  "/more",
  "/coach",
  "/settings",
  "/social",
  "/erfolge",
  "/geraete",
  "/rezepte",
  "/workouts/my-plans",
  "/workouts/records",
  "/workouts/catalog",
  "/workouts/history",
  "/workouts/calendar",
] as const;

/** More hub — featured shortcuts. */
export const MORE_HUB_FEATURED: NavItem[] = [
  {
    href: "/coach",
    label: "KI Coach",
    icon: Bot,
    description: "Persönliche Tipps und Fragen",
  },
  {
    href: "/settings",
    label: "Einstellungen",
    icon: Settings,
    description: "Profil, Ziele und App",
  },
];

/** More hub — training & content. */
export const MORE_HUB_TRAINING: NavItem[] = [
  {
    href: "/workouts/my-plans",
    label: "Meine Pläne",
    icon: FolderOpen,
    description: "Trainingspläne verwalten",
  },
  {
    href: "/workouts/records",
    label: "Rekorde",
    icon: Medal,
    description: "Persönliche Bestleistungen",
  },
  {
    href: "/nutrition",
    label: "Gespeicherte Mahlzeiten",
    icon: Bookmark,
    description: "Vorlagen in der Ernährung",
  },
];

/** Profile panel — Einstellungen, Geräte, Rezepte. */
export const PROFILE_MENU_NAV: NavItem[] = [
  { href: "/settings", label: "Einstellungen", icon: Settings },
  { href: "/geraete", label: "Geräte & Gesundheit", icon: Watch },
  { href: "/rezepte", label: "Rezepte", icon: CookingPot },
];

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
  href: "/settings?view=privacy",
  label: "Datenschutz",
  icon: Lock,
};

export const LOGOUT_ACTION = {
  label: "Abmelden",
  icon: LogOut,
};

/** Desktop sidebar — primary + coach shortcut. */
export const DESKTOP_NAV: NavItem[] = [
  ...PRIMARY_NAV.filter((item) => item.href !== "/more"),
  { href: "/coach", label: "KI Coach", icon: Bot },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];
