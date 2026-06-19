import { auth } from "@/lib/auth";
import {
  loadUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-service";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const data = await loadUserNotifications(session.user.id);
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json().catch(() => ({}));

    if (body.markAllRead === true) {
      await markAllNotificationsRead(session.user.id);
      const data = await loadUserNotifications(session.user.id);
      return jsonOk(data);
    }

    const id = typeof body.id === "string" ? body.id : null;
    if (!id) return jsonError("id fehlt", 400);

    if (body.read === true) {
      await markNotificationRead(session.user.id, id);
    }

    const data = await loadUserNotifications(session.user.id);
    return jsonOk(data);
  } catch (e) {
    return handleApiError(e);
  }
}
