/**
 * Client-side food photo validation + compression before Food AI upload.
 * Keeps EXIF orientation via createImageBitmap where supported.
 */

import {
  FOOD_AI_ALLOWED_MIME,
  FOOD_AI_CLIENT_MAX_BYTES,
} from "@/lib/food/food-ai-schema";

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;
const TARGET_MAX_BYTES = 1_400_000;

export type PrepareFoodImageError =
  | "invalid_type"
  | "too_large"
  | "corrupt"
  | "unsupported";

export class FoodImagePrepareError extends Error {
  code: PrepareFoodImageError;
  constructor(code: PrepareFoodImageError, message: string) {
    super(message);
    this.code = code;
    this.name = "FoodImagePrepareError";
  }
}

function normalizeMime(file: File): string {
  const t = (file.type || "").toLowerCase();
  if (t === "image/jpg") return "image/jpeg";
  return t;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
    } catch {
      /* fall through */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new FoodImagePrepareError("corrupt", "Dieses Bild konnte nicht verarbeitet werden."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new FoodImagePrepareError(
              "unsupported",
              "Dieses Bild konnte nicht verarbeitet werden."
            )
          );
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * Validate + optionally downscale/compress an image for Food AI upload.
 * Returns a File ready for FormData (usually JPEG under ~1.4 MB).
 */
export async function prepareFoodImageForAi(file: File): Promise<File> {
  if (!file || !(file instanceof File)) {
    throw new FoodImagePrepareError(
      "invalid_type",
      "Dieses Bild konnte nicht verarbeitet werden."
    );
  }

  const mime = normalizeMime(file);
  if (!FOOD_AI_ALLOWED_MIME.has(mime) && !file.name.match(/\.(jpe?g|png|webp)$/i)) {
    throw new FoodImagePrepareError(
      "invalid_type",
      "Bitte ein JPEG-, PNG- oder WebP-Bild wählen."
    );
  }

  if (file.size > FOOD_AI_CLIENT_MAX_BYTES) {
    throw new FoodImagePrepareError(
      "too_large",
      "Bild zu groß (max. 12 MB). Bitte ein kleineres Foto wählen."
    );
  }

  // Small enough and already JPEG/WebP — skip heavy work when under target.
  if (
    file.size <= TARGET_MAX_BYTES &&
    (mime === "image/jpeg" || mime === "image/webp") &&
    file.size > 0
  ) {
    // Still verify it decodes
    const bmp = await loadBitmap(file);
    if ("close" in bmp && typeof bmp.close === "function") bmp.close();
    return file;
  }

  const bitmap = await loadBitmap(file);
  const srcW =
    "width" in bitmap ? Number(bitmap.width) : (bitmap as HTMLImageElement).naturalWidth;
  const srcH =
    "height" in bitmap ? Number(bitmap.height) : (bitmap as HTMLImageElement).naturalHeight;

  if (!srcW || !srcH) {
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
    throw new FoodImagePrepareError(
      "corrupt",
      "Dieses Bild konnte nicht verarbeitet werden."
    );
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
    throw new FoodImagePrepareError(
      "unsupported",
      "Dieses Bild konnte nicht verarbeitet werden."
    );
  }
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  let quality = JPEG_QUALITY;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > TARGET_MAX_BYTES && quality > 0.55) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  const name = (file.name || "food.jpg").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}
