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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

    const limit = rateLimit(`photo:${userId}`, 10, 3600_000);
    if (!limit.success) return jsonError("Zu viele Uploads", 429);

    if (!isPrivateStorageConfigured()) {
      return jsonError(
        "Foto-Speicher nicht konfiguriert — SUPABASE_SERVICE_ROLE_KEY fehlt",
        503
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || undefined;
    if (!file) return jsonError("Keine Datei");

    const invalid = validateImageUpload(file);
    if (invalid) return jsonError(invalid);

    const buffer = await readUploadBuffer(file);
    const contentType = (file.type || "image/jpeg").toLowerCase();
    const storageKey = buildProgressPhotoKey(
      userId,
      extensionForMime(contentType)
    );

    await uploadPrivateObject(storageKey, buffer, contentType);

    const base64 = buffer.toString("base64");
    const analysis = await analyzeProgressPhoto(base64, userId);

    let photo;
    try {
      photo = await prisma.progressPhoto.create({
        data: {
          userId,
          imageUrl: storageKey,
          caption,
          aiAnalysis: analysis.analysis,
          aiBodyFat: analysis.bodyFat,
          aiMuscle: analysis.muscle,
          aiProgress: analysis.progress,
        },
      });
    } catch (e) {
      // Do not leave an orphaned object behind if the row could not be written.
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
