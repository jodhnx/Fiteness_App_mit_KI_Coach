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
  Watch,
  Bell,
  Info,
  User,
  Users,
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

/** Profile panel — everything under Einstellungen (no duplicate main-nav items). */
export const PROFILE_MENU_NAV: NavItem[] = [
  { href: "/settings", label: "Einstellungen", icon: Settings },
  { href: "/settings#settings-konto", label: "Konto", icon: User },
  { href: "/settings#settings-geraete", label: "Geräte & Gesundheit", icon: Watch },
  { href: "/settings#settings-datenschutz", label: "Datenschutz", icon: Lock },
  { href: "/settings/support", label: "Support & Feedback", icon: MessageCircle },
  { href: "/settings#settings-benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { href: "/settings#settings-app", label: "Über die App", icon: Info },
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
  href: "/settings#settings-datenschutz",
  label: "Datenschutz",
  icon: Lock,
};

export const LOGOUT_ACTION = {
  label: "Abmelden",
  icon: LogOut,
};
