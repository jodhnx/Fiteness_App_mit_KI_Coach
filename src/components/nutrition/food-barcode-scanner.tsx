"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Flashlight,
  Keyboard,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { Button } from "@/components/ui/button";
import { macrosForQuantity } from "@/lib/food-macros";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";

type Phase = "scan" | "manual" | "loading" | "found" | "not_found";

type Props = {
  open: boolean;
  onClose: () => void;
  onProductReady: (product: FoodProduct) => void;
  onManualAdd?: (barcode?: string) => void;
};

const SCAN_HISTORY_KEY = "nexform:barcode-scan-history";
const DEDUPE_MS = 2500;

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

function pushScanHistory(ean: string, name?: string) {
  try {
    const raw = sessionStorage.getItem(SCAN_HISTORY_KEY);
    const prev: { ean: string; name?: string; at: number }[] = raw
      ? JSON.parse(raw)
      : [];
    const next = [
      { ean, name, at: Date.now() },
      ...prev.filter((p) => p.ean !== ean),
    ].slice(0, 12);
    sessionStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function readScanHistory(): { ean: string; name?: string; at: number }[] {
  try {
    const raw = sessionStorage.getItem(SCAN_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function FoodBarcodeScanner({
  open,
  onClose,
  onProductReady,
  onManualAdd,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("scan");
  const [manualEan, setManualEan] = useState("");
  const [error, setError] = useState("");
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [history, setHistory] = useState<
    { ean: string; name?: string; at: number }[]
  >([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const readerId = "nexform-barcode-reader";

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopScanner = useCallback(async () => {
    scanningRef.current = false;
    setTorchOn(false);
    setTorchSupported(false);
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const lookupEan = useCallback(async (ean: string) => {
    const normalized = ean.replace(/\D/g, "");
    if (normalized.length < 8 || normalized.length > 14) {
      setError("Ungültiger Barcode (EAN-8/13 oder UPC erwartet)");
      setPhase("manual");
      return;
    }
    setPhase("loading");
    setError("");
    setProduct(null);
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(40);
      }
      const res = await fetch(
        `/api/food/barcode/${encodeURIComponent(normalized)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Suche fehlgeschlagen");
        setPhase("not_found");
        setManualEan(normalized);
        return;
      }
      if (data.found && data.food) {
        const food = data.food as FoodProduct;
        setProduct(food);
        setPhase("found");
        pushScanHistory(normalized, food.name);
        setHistory(readScanHistory());
      } else {
        setError(data.message ?? "Produkt nicht gefunden");
        setPhase("not_found");
        setManualEan(normalized);
      }
    } catch {
      setError("Netzwerkfehler");
      setPhase("not_found");
      setManualEan(normalized);
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const s = scannerRef.current;
    if (!s?.isScanning) return;
    try {
      // html5-qrcode exposes torch via applyVideoConstraints when supported
      const next = !torchOn;
      const apply = (
        s as unknown as {
          applyVideoConstraints?: (c: MediaTrackConstraints) => Promise<void>;
        }
      ).applyVideoConstraints;
      await apply?.({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  useEffect(() => {
    if (!open || phase !== "scan") return;
    let cancelled = false;

    const start = async () => {
      await stopScanner();
      if (cancelled) return;
      try {
        const scanner = new Html5Qrcode(readerId, {
          formatsToSupport: BARCODE_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;
        scanningRef.current = true;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.777,
            disableFlip: false,
          },
          (decoded) => {
            if (!scanningRef.current) return;
            const code = decoded.replace(/\D/g, "");
            const now = Date.now();
            const last = lastScanRef.current;
            if (
              last &&
              last.code === code &&
              now - last.at < DEDUPE_MS
            ) {
              return;
            }
            lastScanRef.current = { code, at: now };
            scanningRef.current = false;
            void stopScanner().then(() => lookupEan(code));
          },
          () => undefined
        );

        // Probe torch support after start
        try {
          const track = (
            scanner as unknown as {
              getRunningTrackCameraCapabilities?: () => {
                torchFeature?: () => { isSupported: () => boolean };
              };
            }
          ).getRunningTrackCameraCapabilities?.();
          const torch = track?.torchFeature?.();
          if (torch?.isSupported?.()) setTorchSupported(true);
        } catch {
          setTorchSupported(false);
        }
      } catch {
        setError(
          "Kamerazugriff verweigert oder nicht verfügbar — Barcode manuell eingeben."
        );
        setPhase("manual");
      }
    };

    void start();
    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, phase, lookupEan, stopScanner]);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setPhase("scan");
      setProduct(null);
      setError("");
      setManualEan("");
      setTorchOn(false);
    } else {
      setHistory(readScanHistory());
    }
  }, [open, stopScanner]);

  if (!mounted || !open) return null;

  const grams = product ? getDefaultQuickAddGrams(product) : 100;
  const macros = product
    ? macrosForQuantity(
        {
          calories: product.calories,
          proteinG: product.proteinG,
          carbsG: product.carbsG,
          fatG: product.fatG,
          servingG: product.servingG || 100,
        },
        grams
      )
    : null;
  const ext = product?.extended;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-zinc-950"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scannen"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div>
          <p className="text-sm font-bold text-white">Barcode scannen</p>
          <p className="text-[11px] text-zinc-500">
            EAN-13 · EAN-8 · UPC · Open Food Facts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {phase === "scan" && torchSupported && (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                torchOn
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-zinc-800 text-zinc-300"
              }`}
              aria-label="Taschenlampe"
            >
              <Flashlight className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              void stopScanner();
              onClose();
            }}
            className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {phase === "scan" && (
          <>
            <div className="relative">
              <div
                id={readerId}
                className="w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black min-h-[260px]"
              />
              <div
                className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 rounded-xl border-2 border-accent/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                aria-hidden
              />
            </div>
            <p className="text-center text-[11px] text-zinc-500">
              Barcode im Rahmen halten — Erkennung in Echtzeit
            </p>
            <button
              type="button"
              className="w-full h-11 rounded-2xl border border-zinc-700 text-zinc-300 text-sm font-medium flex items-center justify-center gap-2"
              onClick={() => {
                void stopScanner();
                setPhase("manual");
              }}
            >
              <Keyboard className="h-4 w-4" />
              Barcode manuell eingeben
            </button>
            {history.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Zuletzt gescannt
                </p>
                <ul className="space-y-1.5">
                  {history.slice(0, 5).map((h) => (
                    <li key={`${h.ean}-${h.at}`}>
                      <button
                        type="button"
                        className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2"
                        onClick={() => {
                          void stopScanner().then(() => lookupEan(h.ean));
                        }}
                      >
                        <p className="text-sm text-white truncate">
                          {h.name ?? "Produkt"}
                        </p>
                        <p className="text-[11px] text-zinc-500 tabular-nums">
                          {h.ean}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {phase === "manual" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">EAN / UPC eingeben</p>
            <input
              type="text"
              inputMode="numeric"
              value={manualEan}
              onChange={(e) => setManualEan(e.target.value)}
              placeholder="z. B. 9001234567890"
              className="w-full h-12 rounded-2xl bg-zinc-900 border border-zinc-700 px-4 text-white"
              autoFocus
            />
            {error && <p className="text-xs text-amber-400">{error}</p>}
            <Button
              className="w-full h-12 rounded-2xl"
              onClick={() => void lookupEan(manualEan)}
            >
              Suchen
            </Button>
            <Button
              variant="secondary"
              className="w-full h-11 rounded-2xl"
              onClick={() => {
                setError("");
                setPhase("scan");
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Kamera öffnen
            </Button>
          </div>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-zinc-400">
              Produkt wird in DB & Open Food Facts gesucht …
            </p>
          </div>
        )}

        {phase === "found" && product && macros && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4 space-y-3">
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  className="mx-auto h-28 w-28 rounded-xl object-contain bg-white/5"
                />
              )}
              <p className="text-lg font-bold text-white text-center">
                {product.name}
              </p>
              {product.brand && (
                <p className="text-sm text-zinc-500 text-center">
                  {product.brand}
                </p>
              )}
              {product.barcode && (
                <p className="text-[11px] text-zinc-600 tabular-nums text-center">
                  EAN {product.barcode}
                </p>
              )}
              <p className="text-sm text-zinc-300 tabular-nums text-center pt-1">
                pro 100 g/ml · Portion {product.servingLabel ?? `${grams} g`}
              </p>
              <p className="text-sm font-semibold text-white tabular-nums text-center">
                {Math.round(product.calories)} kcal · {product.proteinG} g P ·{" "}
                {product.carbsG} g C · {product.fatG} g F
              </p>
              {(ext?.sugarG != null ||
                ext?.saturatedFatG != null ||
                ext?.fiberG != null ||
                ext?.saltG != null ||
                product.fiberG != null) && (
                <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-400 pt-1">
                  {(ext?.sugarG ?? null) != null && (
                    <li>Zucker: {ext!.sugarG} g</li>
                  )}
                  {(ext?.saturatedFatG ?? null) != null && (
                    <li>Gesättigte Fette: {ext!.saturatedFatG} g</li>
                  )}
                  {(ext?.fiberG ?? product.fiberG) != null && (
                    <li>Ballaststoffe: {ext?.fiberG ?? product.fiberG} g</li>
                  )}
                  {(ext?.saltG ?? null) != null && (
                    <li>Salz: {ext!.saltG} g</li>
                  )}
                </ul>
              )}
              {product.allergens && product.allergens.length > 0 && (
                <p className="text-[11px] text-amber-300/90">
                  Allergene: {product.allergens.slice(0, 8).join(", ")}
                </p>
              )}
              {product.ingredientsText && (
                <p className="text-[11px] text-zinc-500 line-clamp-4 leading-relaxed">
                  Zutaten: {product.ingredientsText}
                </p>
              )}
              <p className="text-[11px] text-zinc-500 text-center">
                Für Portion ≈{grams} g: {Math.round(macros.calories)} kcal ·{" "}
                {Math.round(macros.proteinG)} P · {Math.round(macros.carbsG)} C ·{" "}
                {Math.round(macros.fatG)} F
              </p>
            </div>
            <Button
              className="w-full h-12 rounded-2xl"
              onClick={() => {
                onProductReady(product);
                onClose();
              }}
            >
              Weiter / Portion wählen
            </Button>
            <Button
              variant="secondary"
              className="w-full h-11 rounded-2xl"
              onClick={() => {
                setProduct(null);
                setPhase("scan");
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Erneut scannen
            </Button>
          </div>
        )}

        {phase === "not_found" && (
          <div className="space-y-4 pt-4">
            <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-4">
              <p className="text-sm font-semibold text-white">
                Produkt nicht gefunden
              </p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {error ||
                  "Dieser Barcode ist lokal und bei Open Food Facts nicht hinterlegt."}
              </p>
              {manualEan && (
                <p className="text-[11px] text-zinc-500 mt-2 tabular-nums">
                  Barcode: {manualEan}
                </p>
              )}
            </div>
            <Button
              className="w-full h-12 rounded-2xl"
              onClick={() => {
                setError("");
                setPhase("scan");
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Erneut scannen
            </Button>
            <Button
              variant="secondary"
              className="w-full h-11 rounded-2xl"
              onClick={() => {
                onManualAdd?.(manualEan || undefined);
                onClose();
              }}
            >
              Manuell hinzufügen
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
