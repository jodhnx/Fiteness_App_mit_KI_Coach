/**
 * Avatars stored as data: URLs can be ~200k chars. Never put those on
 * list/feed payloads — initials render instead. File/HTTP URLs stay.
 * Own profile/settings still read the full User.image via /api/profile.
 */
export function compactPublicAvatar(
  image: string | null | undefined
): string | null {
  if (!image) return null;
  if (image.startsWith("data:")) return null;
  if (image.length > 2_000) return null;
  return image;
}
