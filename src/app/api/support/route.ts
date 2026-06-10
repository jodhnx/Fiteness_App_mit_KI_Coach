import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api-response";
import { supportRequestSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/security/rate-limit";
import { sendSupportEmails } from "@/lib/support-email";
import { getSupportEnvIssueMessage } from "@/lib/support-config";
import { apiErrorStatus, formatApiErrorMessage } from "@/lib/format-api-error";
import { tableExists } from "@/lib/prisma-safe";

export async function GET() {
  const envIssue = getSupportEnvIssueMessage();
  const hasTable = await tableExists("SupportRequest");
  return jsonOk({
    ready: !envIssue && hasTable,
    envIssue,
    tableReady: hasTable,
  });
}

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

    const envIssue = getSupportEnvIssueMessage();
    if (envIssue) {
      return jsonError(envIssue, 503);
    }

    if (!(await tableExists("SupportRequest"))) {
      return jsonError(
        'Datenbanktabelle „SupportRequest" fehlt. Bitte ausführen: npx prisma db push',
        503
      );
    }

    const body = await req.json();
    const parsed = supportRequestSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      return jsonError(
        fields ? `Ungültige Eingabe (${fields}).` : "Bitte alle Pflichtfelder korrekt ausfüllen."
      );
    }

    if (parsed.data.website?.trim()) {
      return jsonOk({ ok: true });
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
      const detail =
        emailErr instanceof Error ? emailErr.message : "Unbekannter E-Mail-Fehler";
      return jsonError(`E-Mail konnte nicht gesendet werden: ${detail}`, 502);
    }

    return jsonOk({ ok: true, id: record.id }, 201);
  } catch (e) {
    console.error("[support] POST failed", e);
    const message = formatApiErrorMessage(e);
    return jsonError(message, apiErrorStatus(e));
  }
}
