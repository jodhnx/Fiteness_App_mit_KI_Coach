/**
 * Encode optional weight into ProgressPhoto.caption without a DB migration.
 * Format: `[w:75.2] optional note`
 */

const WEIGHT_RE = /^\[w:(\d+(?:[.,]\d+)?)\]\s*/i;

export function encodePhotoCaption(
  note?: string | null,
  weightKg?: number | null
): string | null {
  const cleanNote = (note ?? "").trim().slice(0, 200);
  const w =
    weightKg != null && Number.isFinite(weightKg) && weightKg > 0
      ? Math.round(weightKg * 10) / 10
      : null;
  if (w == null && !cleanNote) return null;
  if (w == null) return cleanNote;
  return cleanNote ? `[w:${w}] ${cleanNote}` : `[w:${w}]`;
}

export function parsePhotoCaption(caption?: string | null): {
  note: string | null;
  weightKg: number | null;
} {
  if (!caption?.trim()) return { note: null, weightKg: null };
  const m = caption.trim().match(WEIGHT_RE);
  if (!m) return { note: caption.trim(), weightKg: null };
  const weightKg = Number(String(m[1]).replace(",", "."));
  const note = caption.trim().replace(WEIGHT_RE, "").trim() || null;
  return {
    note,
    weightKg: Number.isFinite(weightKg) ? weightKg : null,
  };
}
