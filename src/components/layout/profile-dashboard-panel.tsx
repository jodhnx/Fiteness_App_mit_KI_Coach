"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect } from "react";
import { signOut } from "next-auth/react";
import { X } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { isNavActive } from "@/lib/nav-active";
import {
  PROFILE_MENU_NAV,
  MORE_NAV,
  ADMIN_NAV,
  PRIVACY_NAV,
  LOGOUT_ACTION,
} from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { hapticTap } from "@/lib/haptic";

type Props = {
  userName?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
};

const MenuLink = memo(function MenuLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      onClick={() => {
        hapticTap();
        onNavigate();
      }}
      className={cn("profile-menu-item", active && "profile-menu-item--active")}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-80" />
      <span className="font-medium">{label}</span>
    </Link>
  );
});

/** Whoop-style profile dashboard — slides in from the right with glassmorphism. */
export const ProfileDashboardPanel = memo(function ProfileDashboardPanel({
  userName,
  userImage,
  isAdmin,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { open, setOpen } = useSidebar();
  const close = useCallback(() => setOpen(false), [setOpen]);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    document.body.dataset.profilePanel = "open";
    return () => {
      delete document.body.dataset.profilePanel;
    };
  }, [open]);

  const handleLogout = useCallback(async () => {
    close();
    await signOut({ callbackUrl: "/login", redirect: true });
  }, [close]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="profile-panel-backdrop"
        aria-label="Menü schließen"
        onClick={close}
      />
      <aside
        className="profile-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Profil & Navigation"
      >
        <div className="profile-panel-header">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="rounded-full ring-2 ring-accent/40 ring-offset-2 ring-offset-zinc-950">
              <UserAvatar src={userImage} name={userName} size="lg" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">
                {userName?.trim() || "Willkommen"}
              </p>
              <button
                type="button"
                className="text-xs text-accent/90 hover:text-accent mt-0.5"
                onClick={() => {
                  close();
                  router.push("/settings");
                }}
              >
                Profil anzeigen →
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="profile-panel-close"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="profile-panel-body">
          <nav className="space-y-1">
            {PROFILE_MENU_NAV.map((item) => (
              <MenuLink
                key={`${item.href}-${item.label}`}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavActive(pathname, item.href)}
                onNavigate={close}
              />
            ))}
            <MenuLink
              href={PRIVACY_NAV.href}
              label={PRIVACY_NAV.label}
              icon={PRIVACY_NAV.icon}
              active={pathname.startsWith("/settings")}
              onNavigate={close}
            />
          </nav>

          <div className="my-4 border-t border-white/8" />
          <p className="px-1 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Mehr
          </p>
          <nav className="space-y-1">
            {MORE_NAV.map((item) => (
              <MenuLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavActive(pathname, item.href)}
                onNavigate={close}
              />
            ))}
            {isAdmin && (
              <MenuLink
                href={ADMIN_NAV.href}
                label={ADMIN_NAV.label}
                icon={ADMIN_NAV.icon}
                active={pathname.startsWith("/admin")}
                onNavigate={close}
              />
            )}
          </nav>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="profile-menu-item profile-menu-item--danger mt-4 w-full"
          >
            <LOGOUT_ACTION.icon className="h-5 w-5 shrink-0" />
            <span className="font-medium">{LOGOUT_ACTION.label}</span>
          </button>
        </div>
      </aside>
    </>
  );
});
