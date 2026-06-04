import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeProgressPhoto } from "@/lib/openai";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { awardXP } from "@/lib/gamification";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const limit = rateLimit(`photo:${session.user.id}`, 10, 3600_000);
    if (!limit.success) return jsonError("Zu viele Uploads", 429);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || undefined;
    if (!file) return jsonError("Keine Datei");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${session.user.id}-${Date.now()}.jpg`;
    await writeFile(path.join(uploadDir, filename), buffer);
    const imageUrl = `/uploads/${filename}`;

    const analysis = await analyzeProgressPhoto(base64, session.user.id);

    const photo = await prisma.progressPhoto.create({
      data: {
        userId: session.user.id,
        imageUrl,
        caption,
        aiAnalysis: analysis.analysis,
        aiBodyFat: analysis.bodyFat,
        aiMuscle: analysis.muscle,
        aiProgress: analysis.progress,
      },
    });

    await awardXP(session.user.id, 25, "Fortschrittsfoto hochgeladen");

    return jsonOk({ photo }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
