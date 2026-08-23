import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  isLegacyPublicPhoto,
  isOwnedProgressPhotoKey,
} from "@/lib/progress-photo-storage";
import { deletePrivateObject } from "@/lib/storage/private-storage";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;

    const photo = await prisma.progressPhoto.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, imageUrl: true },
    });
    if (!photo) return jsonError("Foto nicht gefunden", 404);

    // Storage first: a failure here must not leave a row without its object.
    if (
      !isLegacyPublicPhoto(photo.imageUrl) &&
      isOwnedProgressPhotoKey(photo.imageUrl, session.user.id)
    ) {
      await deletePrivateObject(photo.imageUrl);
    }

    const deleted = await prisma.progressPhoto.deleteMany({
      where: { id: photo.id, userId: session.user.id },
    });
    if (!deleted.count) return jsonError("Foto nicht gefunden", 404);

    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
