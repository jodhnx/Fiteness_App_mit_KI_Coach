"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import { signOut } from "next-auth/react";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
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
      onClick={onNavigate}
      className={cn(
        "profile-menu-item",
        active && "profile-menu-item--active"
      )}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-80" />
      <span className="font-medium">{label}</span>
    </Link>
  );
});

export const ProfileMenuSheet = memo(function ProfileMenuSheet({
  userName,
  userImage,
  isAdmin,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { open, setOpen } = useSidebar();
  const close = useCallback(() => setOpen(false), [setOpen]);

  const handleLogout = useCallback(async () => {
    close();
    await signOut({ callbackUrl: "/login", redirect: true });
  }, [close]);

  return (
    <MobileBottomSheet
      open={open}
      onClose={close}
      title={userName?.trim() || "Account"}
      subtitle="Navigation & Einstellungen"
      variant="full"
      bodyClassName="profile-menu-body"
    >
      <div className="profile-menu-hero glass-panel mb-4 flex items-center gap-4 p-4">
        <span className="rounded-full ring-2 ring-accent/40 ring-offset-2 ring-offset-zinc-950 shadow-lg shadow-cyan-500/15">
          <UserAvatar src={userImage} name={userName} size="xl" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-white truncate">
            {userName?.trim() || "Willkommen"}
          </p>
          <button
            type="button"
            className="text-sm text-cyan-400/90 hover:text-cyan-300 mt-0.5"
            onClick={() => {
              close();
              router.push("/settings");
            }}
          >
            Profil anzeigen →
          </button>
        </div>
      </div>

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
    </MobileBottomSheet>
  );
});
