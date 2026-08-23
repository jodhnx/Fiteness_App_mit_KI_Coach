/**
 * Location rules for progress photos.
 *
 * `ProgressPhoto.imageUrl` holds one of two things:
 *  - a private storage object key, always `<userId>/<serverGeneratedId>.<ext>`
 *  - a legacy public path `/uploads/<file>` from before private storage
 *
 * The leading slash distinguishes the two, so no schema change is needed.
 * Legacy entries are never served publicly; they must be migrated first
 * (see scripts/migrate-progress-photos.ts).
 */

import { randomBytes } from "crypto";
import { isSafeObjectKey } from "@/lib/storage/private-storage";

export const LEGACY_PUBLIC_PREFIX = "/uploads/";

export function isLegacyPublicPhoto(imageUrl: string): boolean {
  return imageUrl.startsWith(LEGACY_PUBLIC_PREFIX);
}

const ALLOWED_EXTENSIONS = new Set(["jpg", "png", "webp"]);

export function extensionForMime(mime: string): "jpg" | "png" | "webp" {
  const type = (mime || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

export function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/** Non-guessable, server-generated key inside the owner's prefix. */
export function buildProgressPhotoKey(userId: string, extension: string): string {
  const ext = ALLOWED_EXTENSIONS.has(extension) ? extension : "jpg";
  return `${userId}/${randomBytes(16).toString("hex")}.${ext}`;
}

/** Deterministic key used by the migration so re-runs cannot duplicate objects. */
export function buildMigratedProgressPhotoKey(
  userId: string,
  photoId: string,
  extension: string
): string {
  const ext = ALLOWED_EXTENSIONS.has(extension) ? extension : "jpg";
  return `${userId}/${photoId}.${ext}`;
}

/**
 * A storage key must never be the only authorization signal. Ownership is
 * checked against the database first; this additionally verifies the key
 * really lives inside that user's prefix.
 */
export function isOwnedProgressPhotoKey(key: string, userId: string): boolean {
  return isSafeObjectKey(key) && key.startsWith(`${userId}/`);
}

/** Stable, session-protected URL the client uses as image source. */
export function progressPhotoImageUrl(photoId: string): string {
  return `/api/progress/photos/${photoId}/image`;
}
