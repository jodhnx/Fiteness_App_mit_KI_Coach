import { NextRequest } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { rateLimit } from "@/lib/security/rate-limit";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function extForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function removeOldAvatar(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/uploads/avatars/")) return;
  const filePath = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  await unlink(filePath).catch(() => {});
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const limit = rateLimit(`avatar:${session.user.id}`, 20, 3600_000);
    if (!limit.success) return jsonError("Zu viele Uploads", 429);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return jsonError("Keine Datei ausgewählt", 400);
    if (!ALLOWED.has(file.type)) {
      return jsonError("Nur JPG, PNG oder WebP erlaubt", 400);
    }
    if (file.size > MAX_BYTES) return jsonError("Maximal 2 MB", 400);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });

    const ext = extForMime(file.type);
    const filename = `${session.user.id}.${ext}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    const imageUrl = `/uploads/avatars/${filename}?v=${Date.now()}`;

    await removeOldAvatar(user?.image);

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
      select: { id: true, name: true, image: true },
    });

    return jsonOk({ user: updated, imageUrl });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });
    await removeOldAvatar(user?.image);

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
      select: { id: true, name: true, image: true },
    });

    return jsonOk({ user: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
