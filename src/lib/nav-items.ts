"use client";

import {
  CalendarRange,
  Settings,
  Watch,
  Users,
  Trophy,
  CookingPot,
  Bot,
  FolderOpen,
  Medal,
  Bookmark,
  Wand2,
  LifeBuoy,
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
  "/workouts/generator",
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
    href: "/workouts/generator",
    label: "KI Plan-Generator",
    icon: Wand2,
    description: "Persönlichen Plan erstellen",
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

/** Quiet grouped hub — More tab. */
export const MORE_HUB_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "KI Coach",
    items: [
      {
        href: "/coach",
        label: "KI Coach",
        icon: Bot,
        description: "Fragen und tägliche Tipps",
      },
    ],
  },
  {
    title: "Training",
    items: [
      {
        href: "/workouts/my-plans",
        label: "Meine Pläne",
        icon: FolderOpen,
        description: "Gespeicherte Trainingspläne",
      },
      {
        href: "/workouts/records",
        label: "Rekorde",
        icon: Medal,
        description: "Persönliche Bestleistungen",
      },
      {
        href: "/workouts/generator",
        label: "KI Plan",
        icon: Wand2,
        description: "Plan vom Coach erstellen",
      },
    ],
  },
  {
    title: "Ernährung",
    items: [
      {
        href: "/nutrition",
        label: "Gespeicherte Mahlzeiten",
        icon: Bookmark,
        description: "Favoriten und Vorlagen",
      },
      {
        href: "/rezepte",
        label: "Rezepte",
        icon: CookingPot,
        description: "Gerichte nachkochen",
      },
    ],
  },
  {
    title: "Fortschritt",
    items: [
      {
        href: "/progress",
        label: "Wochenanalyse",
        icon: CalendarRange,
        description: "Trends der letzten Tage",
      },
      {
        href: "/erfolge",
        label: "Erfolge",
        icon: Trophy,
        description: "Abzeichen und Meilensteine",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        href: "/social",
        label: "Community",
        icon: Users,
        description: "Feed und Freunde",
      },
    ],
  },
  {
    title: "Geräte",
    items: [
      {
        href: "/geraete",
        label: "Geräte",
        icon: Watch,
        description: "Wearables und Sync",
      },
    ],
  },
  {
    title: "Einstellungen",
    items: [
      {
        href: "/settings",
        label: "Einstellungen",
        icon: Settings,
        description: "Profil, Ziele, Account",
      },
      {
        href: "/settings/support",
        label: "Support",
        icon: LifeBuoy,
        description: "Hilfe und Feedback",
      },
    ],
  },
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
