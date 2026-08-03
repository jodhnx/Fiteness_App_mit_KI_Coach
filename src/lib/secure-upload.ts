import { createHash, randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);
const MAX_BYTES = 8 * 1024 * 1024;

export function validateImageUpload(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  if (type && !ALLOWED.has(type) && type !== "image/jpg") {
    return "Nur JPEG, PNG oder WebP erlaubt";
  }
  if (file.size > MAX_BYTES) {
    return "Datei zu groß (max. 8 MB)";
  }
  return null;
}

function extFor(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

/** Store under non-guessable name; still under public/uploads until private storage ships. */
export async function saveUserUpload(
  userId: string,
  file: File,
  prefix = "prog"
): Promise<{ filename: string; imageUrl: string; buffer: Buffer }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const hash = createHash("sha256")
    .update(userId)
    .update(randomBytes(16))
    .digest("hex")
    .slice(0, 24);
  const filename = `${prefix}-${hash}.${extFor(file.type || "image/jpeg")}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { filename, imageUrl: `/uploads/${filename}`, buffer };
}
