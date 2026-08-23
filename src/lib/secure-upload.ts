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

/**
 * Reads the upload into memory for validation and storage.
 * Uploads are never written to the local filesystem — on Vercel that is
 * ephemeral, and `public/` would expose them without authentication.
 */
export async function readUploadBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}
