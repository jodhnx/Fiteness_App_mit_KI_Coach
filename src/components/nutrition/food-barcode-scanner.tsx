"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Keyboard, Loader2, RefreshCw, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { Button } from "@/components/ui/button";
import { macrosForQuantity } from "@/lib/food-macros";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";

type Phase = "scan" | "manual" | "loading" | "found" | "not_found";

type Props = {
  open: boolean;
  onClose: () => void;
  onProductReady: (product: FoodProduct) => void;
  onManualAdd?: () => void;
};

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const readerId = "nexform-barcode-reader";

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopScanner = useCallback(async () => {
    scanningRef.current = false;
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
    if (normalized.length < 8) {
      setError("Ungültiger Barcode");
      setPhase("manual");
      return;
    }
    setPhase("loading");
    setError("");
    setProduct(null);
    try {
      const res = await fetch(`/api/food/barcode/${encodeURIComponent(normalized)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Suche fehlgeschlagen");
        setPhase("not_found");
        return;
      }
      if (data.found && data.food) {
        setProduct(data.food as FoodProduct);
        setPhase("found");
      } else {
        setError(data.message ?? "Produkt nicht gefunden");
        setPhase("not_found");
      }
    } catch {
      setError("Netzwerkfehler");
      setPhase("not_found");
    }
  }, []);

  useEffect(() => {
    if (!open || phase !== "scan") return;
    let cancelled = false;

    const start = async () => {
      await stopScanner();
      if (cancelled) return;
      try {
        const scanner = new Html5Qrcode(readerId);
        scannerRef.current = scanner;
        scanningRef.current = true;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 260, height: 140 } },
          (decoded) => {
            if (!scanningRef.current) return;
            scanningRef.current = false;
            void stopScanner().then(() => lookupEan(decoded));
          },
          () => undefined
        );
      } catch {
        setError("Kamera nicht verfügbar — Barcode manuell eingeben.");
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
          <p className="text-[11px] text-zinc-500">EAN · Open Food Facts</p>
        </div>
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {phase === "scan" && (
          <>
            <div
              id={readerId}
              className="w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black min-h-[240px]"
            />
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
          </>
        )}

        {phase === "manual" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">EAN / Barcode eingeben</p>
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
            <p className="text-sm text-zinc-400">Produkt wird gesucht …</p>
          </div>
        )}

        {phase === "found" && product && macros && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4 space-y-2">
              <p className="text-lg font-bold text-white">{product.name}</p>
              {product.brand && (
                <p className="text-sm text-zinc-500">{product.brand}</p>
              )}
              {product.barcode && (
                <p className="text-[11px] text-zinc-600 tabular-nums">
                  EAN {product.barcode}
                </p>
              )}
              <p className="text-sm text-zinc-300 tabular-nums pt-1">
                {product.servingLabel ?? `${grams} g`}
              </p>
              <p className="text-sm font-semibold text-white tabular-nums">
                {Math.round(macros.calories)} kcal · {Math.round(macros.proteinG)} P ·{" "}
                {Math.round(macros.carbsG)} C · {Math.round(macros.fatG)} F
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
              <p className="text-sm font-semibold text-white">Produkt nicht gefunden</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {error || "Dieser Barcode ist in der Datenbank nicht hinterlegt."}
              </p>
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
                onManualAdd?.();
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
