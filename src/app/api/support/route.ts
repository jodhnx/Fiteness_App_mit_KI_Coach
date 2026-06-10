import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { supportRequestSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/security/rate-limit";
import { sendSupportEmails, isSupportEmailConfigured } from "@/lib/support-email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const limitKey = session?.user?.id ? `support:user:${session.user.id}` : `support:ip:${ip}`;
    const limit = rateLimit(limitKey, 5, 3_600_000);
    if (!limit.success) {
      return jsonError("Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.", 429);
    }

    const body = await req.json();
    const parsed = supportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Bitte alle Pflichtfelder korrekt ausfüllen.");
    }

    if (parsed.data.website?.trim()) {
      return jsonOk({ ok: true });
    }

    if (!isSupportEmailConfigured()) {
      return jsonError(
        "Support ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.",
        503
      );
    }

    const createdAt = new Date();
    const record = await prisma.supportRequest.create({
      data: {
        userId: session?.user?.id,
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim().toLowerCase(),
        category: parsed.data.category,
        message: parsed.data.message.trim(),
      },
    });

    try {
      await sendSupportEmails({
        name: record.name,
        email: record.email,
        category: record.category,
        message: record.message,
        userId: record.userId,
        createdAt,
      });
    } catch (emailErr) {
      console.error("[support] email failed", emailErr);
      await prisma.supportRequest.delete({ where: { id: record.id } }).catch(() => {});
      return jsonError(
        "E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.",
        502
      );
    }

    return jsonOk({ ok: true, id: record.id }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
