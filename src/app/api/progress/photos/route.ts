import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeProgressPhoto } from "@/lib/openai";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { awardXP } from "@/lib/gamification";
import { readUploadBuffer, validateImageUpload } from "@/lib/secure-upload";
import {
  buildProgressPhotoKey,
  extensionForMime,
  progressPhotoImageUrl,
} from "@/lib/progress-photo-storage";
import {
  deletePrivateObject,
  isPrivateStorageConfigured,
  uploadPrivateObject,
} from "@/lib/storage/private-storage";
import { encodePhotoCaption } from "@/lib/progress-photo-meta";
import { isValid, startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

    const limit = rateLimit(`photo:${userId}`, 20, 3600_000);
    if (!limit.success) return jsonError("Zu viele Uploads", 429);

    if (!isPrivateStorageConfigured()) {
      return jsonError(
        "Foto-Speicher nicht konfiguriert — SUPABASE_SERVICE_ROLE_KEY fehlt",
        503
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const captionRaw = (formData.get("caption") as string) || undefined;
    const weightRaw = formData.get("weightKg");
    const takenAtRaw = formData.get("takenAt");
    const analyzeFlag = String(formData.get("analyze") ?? "0") === "1";

    if (!file) return jsonError("Keine Datei");

    const invalid = validateImageUpload(file);
    if (invalid) return jsonError(invalid);

    const weightKg =
      weightRaw != null && String(weightRaw).trim()
        ? Number(String(weightRaw).replace(",", "."))
        : null;
    const caption = encodePhotoCaption(
      captionRaw,
      weightKg != null && Number.isFinite(weightKg) ? weightKg : null
    );

    let takenAt = new Date();
    if (typeof takenAtRaw === "string" && takenAtRaw.trim()) {
      const d = startOfDay(new Date(takenAtRaw));
      if (isValid(d)) takenAt = d;
    }

    const buffer = await readUploadBuffer(file);
    const contentType = (file.type || "image/jpeg").toLowerCase();
    const storageKey = buildProgressPhotoKey(
      userId,
      extensionForMime(contentType)
    );

    await uploadPrivateObject(storageKey, buffer, contentType);

    // Privacy: never send progress photos to AI unless the client opts in.
    let analysis = {
      analysis: null as string | null,
      bodyFat: null as string | null,
      muscle: null as string | null,
      progress: null as string | null,
    };
    if (analyzeFlag) {
      const base64 = buffer.toString("base64");
      const ai = await analyzeProgressPhoto(base64, userId);
      analysis = {
        analysis: ai.analysis ?? null,
        bodyFat: ai.bodyFat ?? null,
        muscle: ai.muscle ?? null,
        progress: ai.progress ?? null,
      };
    }

    let photo;
    try {
      photo = await prisma.progressPhoto.create({
        data: {
          userId,
          imageUrl: storageKey,
          caption,
          takenAt,
          aiAnalysis: analysis.analysis,
          aiBodyFat: analysis.bodyFat,
          aiMuscle: analysis.muscle,
          aiProgress: analysis.progress,
        },
      });
    } catch (e) {
      await deletePrivateObject(storageKey).catch(() => {});
      throw e;
    }

    await awardXP(userId, 25, "Fortschrittsfoto hochgeladen");

    return jsonOk(
      { photo: { ...photo, imageUrl: progressPhotoImageUrl(photo.id) } },
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}
