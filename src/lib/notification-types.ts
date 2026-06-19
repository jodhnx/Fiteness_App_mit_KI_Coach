export type NotificationCategory =
  | "training"
  | "nutrition"
  | "erfolge"
  | "coach"
  | "system";

export type AppNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  training: "Training",
  nutrition: "Ernährung",
  erfolge: "Erfolge",
  coach: "Coach",
  system: "System",
};

export const NOTIFICATIONS_CACHE_KEY = "app-notifications";

export function mapNotificationCategory(
  type: string,
  title: string,
  link?: string | null
): NotificationCategory {
  const t = title.toLowerCase();
  const l = (link ?? "").toLowerCase();
  if (type === "ACHIEVEMENT" || type === "CHALLENGE" || l.includes("/erfolge")) return "erfolge";
  if (l.includes("/workouts") || l.includes("/training") || t.includes("training") || t.includes("streak"))
    return "training";
  if (
    l.includes("/nutrition") ||
    t.includes("kalorien") ||
    t.includes("protein") ||
    t.includes("ernährung")
  )
    return "nutrition";
  if (l.includes("/coach") || t.includes("coach")) return "coach";
  return "system";
}
