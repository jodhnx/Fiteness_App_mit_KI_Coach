import {
  encodePhotoCaption,
  parsePhotoCaption,
} from "../src/lib/progress-photo-meta";

const encoded = encodePhotoCaption("Frontlicht", 78.5);
if (encoded !== "[w:78.5] Frontlicht") {
  console.error("encode failed", encoded);
  process.exit(1);
}
const parsed = parsePhotoCaption(encoded);
if (parsed.weightKg !== 78.5 || parsed.note !== "Frontlicht") {
  console.error("parse failed", parsed);
  process.exit(1);
}
const noteOnly = parsePhotoCaption("nur notiz");
if (noteOnly.weightKg != null || noteOnly.note !== "nur notiz") {
  console.error("note-only failed", noteOnly);
  process.exit(1);
}
console.log("progress-photo-meta smoke OK");
