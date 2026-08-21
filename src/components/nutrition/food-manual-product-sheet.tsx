"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FoodProduct } from "@/lib/food/food-product-types";

type Props = {
  open: boolean;
  initialBarcode?: string;
  onClose: () => void;
  onCreated: (product: FoodProduct) => void;
};

export function FoodManualProductSheet({
  open,
  initialBarcode = "",
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [quantityG, setQuantityG] = useState("100");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open || typeof document === "undefined") return null;

  const submit = async () => {
    setError("");
    const servingG = Number(quantityG) || 100;
    if (!name.trim()) {
      setError("Produktname fehlt");
      return;
    }
    if (!calories || Number(calories) < 0) {
      setError("kcal angeben");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/food", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || undefined,
          barcode: barcode.replace(/\D/g, "") || undefined,
          servingG,
          calories: Number(calories),
          proteinG: Number(proteinG) || 0,
          carbsG: Number(carbsG) || 0,
          fatG: Number(fatG) || 0,
          category: "OTHER",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Speichern fehlgeschlagen");
        return;
      }
      const food = (data.food ?? data.product ?? data) as FoodProduct;
      onCreated(food);
      onClose();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[85] flex flex-col bg-zinc-950"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Produkt manuell hinzufügen"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <p className="text-sm font-bold text-white">Manuell hinzufügen</p>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-lg mx-auto w-full">
        <p className="text-xs text-zinc-500 leading-relaxed">
          Nur für dich gespeichert — nicht in der globalen Datenbank anderer Nutzer.
        </p>
        {(
          [
            ["name", "Produktname *", name, setName, "text"],
            ["brand", "Marke", brand, setBrand, "text"],
            ["barcode", "Barcode (optional)", barcode, setBarcode, "text"],
            ["quantityG", "Menge (g) *", quantityG, setQuantityG, "decimal"],
            ["calories", "kcal *", calories, setCalories, "decimal"],
            ["proteinG", "Protein (g)", proteinG, setProteinG, "decimal"],
            ["carbsG", "Kohlenhydrate (g)", carbsG, setCarbsG, "decimal"],
            ["fatG", "Fett (g)", fatG, setFatG, "decimal"],
          ] as const
        ).map(([key, label, value, setter, mode]) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs text-zinc-400">{label}</span>
            <input
              type="text"
              inputMode={mode === "decimal" ? "decimal" : "text"}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full h-11 rounded-xl bg-zinc-900 border border-zinc-700 px-3 text-white text-sm"
            />
          </label>
        ))}
        {error && <p className="text-xs text-amber-400">{error}</p>}
        <Button
          className="w-full h-12 rounded-2xl mt-2"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? "Speichern…" : "Speichern & weiter"}
        </Button>
      </div>
    </div>,
    document.body
  );
}
