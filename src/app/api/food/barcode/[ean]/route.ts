import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { importOffProductByCode } from "@/lib/food/food-database-service";

/** Barcode lookup via Open Food Facts → saved in PostgreSQL */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ean: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { ean } = await params;
    const normalized = ean.replace(/\D/g, "");
    if (normalized.length < 8) return jsonError("Ungültiger Barcode", 400);

    const { product, error } = await importOffProductByCode(normalized);
    if (!product) {
      return jsonOk({
        found: false,
        ean: normalized,
        message: error ?? "Produkt nicht in Open Food Facts gefunden",
        scannerReady: true,
      });
    }
    return jsonOk({ found: true, food: product, scannerReady: true });
  } catch (e) {
    return handleApiError(e);
  }
}
