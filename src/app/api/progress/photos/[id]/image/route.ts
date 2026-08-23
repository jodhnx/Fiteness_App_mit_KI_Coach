import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, handleApiError } from "@/lib/api-response";
import {
  isLegacyPublicPhoto,
  isOwnedProgressPhotoKey,
} from "@/lib/progress-photo-storage";
import { createSignedObjectUrl } from "@/lib/storage/private-storage";

type Params = { params: Promise<{ id: string }> };

/**
 * Authenticated delivery of a private progress photo.
 * Ownership is resolved from the session, never from the requested path.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;

    const photo = await prisma.progressPhoto.findFirst({
      where: { id, userId: session.user.id },
      select: { imageUrl: true },
    });
    // Same answer for "does not exist" and "belongs to somebody else".
    if (!photo) return jsonError("Foto nicht gefunden", 404);

    if (isLegacyPublicPhoto(photo.imageUrl)) {
      return jsonError("Foto nicht migriert", 404);
    }
    // Defense in depth: the key must live inside this user's prefix.
    if (!isOwnedProgressPhotoKey(photo.imageUrl, session.user.id)) {
      return jsonError("Foto nicht gefunden", 404);
    }

    const signedUrl = await createSignedObjectUrl(photo.imageUrl);
    if (!signedUrl) return jsonError("Foto nicht gefunden", 404);

    const res = NextResponse.redirect(signedUrl, 307);
    // Every render must pass the ownership check again.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
