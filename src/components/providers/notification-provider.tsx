"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  NOTIFICATIONS_CACHE_KEY,
  type AppNotification,
  type NotificationCategory,
} from "@/lib/notification-types";
import { getCached, setCached } from "@/lib/client-cache";

type Payload = {
  notifications: AppNotification[];
  unreadCount: number;
};

type NotificationContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  filter: NotificationCategory | "all";
  setFilter: (f: NotificationCategory | "all") => void;
  filtered: AppNotification[];
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function normalizePayload(raw: unknown): Payload {
  if (!raw || typeof raw !== "object") {
    return { notifications: [], unreadCount: 0 };
  }
  const d = raw as Partial<Payload>;
  const notifications = Array.isArray(d.notifications) ? d.notifications : [];
  const unreadCount =
    typeof d.unreadCount === "number"
      ? d.unreadCount
      : notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const cached = normalizePayload(getCached<Payload>(NOTIFICATIONS_CACHE_KEY));
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const [data, setData] = useState<Payload>(cached);
  const [loading, setLoading] = useState(cached.notifications.length === 0);

  const apply = useCallback((next: unknown) => {
    const normalized = normalizePayload(next);
    setData(normalized);
    setCached(NOTIFICATIONS_CACHE_KEY, normalized, 90_000);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) return;
      const json = await res.json();
      apply(json);
    } catch (e) {
      console.error("[notifications] fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback((id: string) => {
    setData((prev) => {
      const list = Array.isArray(prev.notifications) ? prev.notifications : [];
      const next = {
        notifications: list.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unreadCount: Math.max(0, (prev.unreadCount ?? 0) - 1),
      };
      setCached(NOTIFICATIONS_CACHE_KEY, next, 90_000);
      return next;
    });
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => undefined);
  }, []);

  const markAllRead = useCallback(() => {
    setData((prev) => {
      const list = Array.isArray(prev.notifications) ? prev.notifications : [];
      const next = {
        notifications: list.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
      setCached(NOTIFICATIONS_CACHE_KEY, next, 90_000);
      return next;
    });
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => json && apply(json))
      .catch(() => undefined);
  }, [apply]);

  const filtered = useMemo(() => {
    const list = Array.isArray(data.notifications) ? data.notifications : [];
    return filter === "all" ? list : list.filter((n) => n.category === filter);
  }, [data.notifications, filter]);

  const value: NotificationContextValue = {
    open,
    setOpen,
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: data.unreadCount ?? 0,
    loading,
    refresh: fetchNotifications,
    markRead,
    markAllRead,
    filter,
    setFilter,
    filtered,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Never throw from shell hooks — that surfaces as global-error
    return {
      open: false,
      setOpen: () => {},
      notifications: [] as AppNotification[],
      unreadCount: 0,
      loading: false,
      refresh: () => {},
      markRead: () => {},
      markAllRead: () => {},
      filter: "all" as const,
      setFilter: () => {},
      filtered: [] as AppNotification[],
    };
  }
  return ctx;
}
