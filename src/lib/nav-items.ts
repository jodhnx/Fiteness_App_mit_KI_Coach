import {
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  Bot,
  Trophy,
  Settings,
  Shield,
  MessageCircle,
  Lock,
  LogOut,
  HeartPulse,
  Watch,
  type LucideIcon,
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

/** Profile panel — simplified: no separate Ziele / Feedback duplicates */
export const PROFILE_MENU_NAV: NavItem[] = [
  { href: "/settings", label: "Account & Einstellungen", icon: Settings },
  { href: "/settings#settings-geraete", label: "Geräte & Gesundheit", icon: Watch },
  { href: "/settings/support", label: "Support & Feedback", icon: MessageCircle },
];

export const MORE_NAV: NavItem[] = [
  { href: "/gesundheit", label: "Gesundheit", icon: HeartPulse },
  { href: "/geraete", label: "Geräte", icon: Watch },
  { href: "/erfolge", label: "Erfolge", icon: Trophy },
];

export const ADMIN_NAV: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
};

export const PRIVACY_NAV: NavItem = {
  href: "/settings#settings-konto",
  label: "Datenschutz",
  icon: Lock,
};

export const LOGOUT_ACTION = {
  label: "Abmelden",
  icon: LogOut,
};
