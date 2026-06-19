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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const cached = getCached<Payload>(NOTIFICATIONS_CACHE_KEY);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const [data, setData] = useState<Payload>(
    cached ?? { notifications: [], unreadCount: 0 }
  );
  const [loading, setLoading] = useState(!cached);

  const apply = useCallback((next: Payload) => {
    setData(next);
    setCached(NOTIFICATIONS_CACHE_KEY, next, 90_000);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) return;
      const json = (await res.json()) as Payload;
      apply(json);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(
    (id: string) => {
      setData((prev) => {
        const next = {
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        };
        setCached(NOTIFICATIONS_CACHE_KEY, next, 90_000);
        return next;
      });
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
    },
    []
  );

  const markAllRead = useCallback(() => {
    setData((prev) => {
      const next = {
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
      setCached(NOTIFICATIONS_CACHE_KEY, next, 90_000);
      return next;
    });
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).then((r) => (r.ok ? r.json() : null)).then((json) => json && apply(json));
  }, [apply]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? data.notifications
        : data.notifications.filter((n) => n.category === filter),
    [data.notifications, filter]
  );

  const value: NotificationContextValue = {
    open,
    setOpen,
    notifications: data.notifications,
    unreadCount: data.unreadCount,
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
  if (!ctx) throw new Error("useNotifications requires NotificationProvider");
  return ctx;
}
