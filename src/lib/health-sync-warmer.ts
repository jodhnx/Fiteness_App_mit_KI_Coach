/** Background health sync on app start — fire-and-forget. */
export function warmHealthSync() {
  if (typeof window === "undefined") return;
  void fetch("/api/wearables/sync", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sinceDays: 3 }),
  }).catch(() => {});
}
