"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ScanBarcode,
  Camera,
  ChefHat,
  ShoppingCart,
  Bell,
  Store,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { hapticTap } from "@/lib/haptic";
import {
  loadShoppingList,
  saveShoppingList,
  type ShoppingItem,
} from "@/lib/shopping-list";

/** Additive nutrition tools: barcode, photo, recipes, shopping, reminders. */
export const NutritionExtrasPanel = memo(function NutritionExtrasPanel() {
  const [barcode, setBarcode] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setList(loadShoppingList());
  }, []);

  const lookupBarcode = useCallback(async () => {
    const code = barcode.replace(/\D/g, "");
    if (code.length < 8) {
      toast.error("Bitte gültigen EAN/Barcode eingeben");
      return;
    }
    setBusy(true);
    hapticTap();
    try {
      const res = await fetch(`/api/food/barcode/${code}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Produkt nicht gefunden");
        return;
      }
      const name = data.product?.name ?? data.name ?? "Produkt";
      toast.success(`Gefunden: ${name}`);
      setList((prev) => {
        const next = [...prev, { id: crypto.randomUUID(), name, done: false }];
        saveShoppingList(next);
        return next;
      });
    } catch {
      toast.error("Barcode-Lookup fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }, [barcode]);

  async function onPhotoPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    hapticTap();
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/nutrition/photo-recognize", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erkennung fehlgeschlagen");
        return;
      }
      toast.success(data.suggestion ?? "Lebensmittel erkannt — bitte bestätigen");
      if (data.name) {
        setList((prev) => {
          const next = [
            ...prev,
            { id: crypto.randomUUID(), name: String(data.name), done: false },
          ];
          saveShoppingList(next);
          return next;
        });
      }
    } catch {
      toast.error("Foto-Analyse nicht verfügbar");
    } finally {
      setBusy(false);
    }
  }

  function addManual() {
    const name = newItem.trim();
    if (!name) return;
    const next = [...list, { id: crypto.randomUUID(), name, done: false }];
    setList(next);
    saveShoppingList(next);
    setNewItem("");
    hapticTap();
  }

  function toggleItem(id: string) {
    const next = list.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setList(next);
    saveShoppingList(next);
  }

  function enableMealReminder() {
    hapticTap();
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.message("Benachrichtigungen nicht unterstützt");
      return;
    }
    void Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        localStorage.setItem("nexform:meal-reminders", "1");
        toast.success("Essenserinnerungen aktiviert");
        try {
          new Notification("NEXFORM", {
            body: "Wir erinnern dich an deine Mahlzeiten (Browser).",
          });
        } catch {
          /* ignore */
        }
      } else {
        toast.message("Berechtigung benötigt");
      }
    });
  }

  return (
    <div className="space-y-3">
      <PremiumCard className="space-y-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
          Schneller erfassen
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 flex gap-2">
            <Input
              placeholder="Barcode / EAN"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="h-11"
              inputMode="numeric"
            />
            <Button
              type="button"
              variant="premium"
              className="h-11 shrink-0"
              disabled={busy}
              onClick={() => void lookupBarcode()}
            >
              <ScanBarcode className="h-4 w-4 mr-1" />
              Scan
            </Button>
          </div>
          <label className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 h-11 text-sm text-zinc-200 cursor-pointer active:bg-zinc-800">
            <Camera className="h-4 w-4 text-accent" />
            KI-Foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => void onPhotoPick(e.target.files?.[0] ?? null)}
            />
          </label>
          <Link
            href="/nutrition/saved-meals/new"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 h-11 text-sm text-zinc-200"
          >
            <ChefHat className="h-4 w-4 text-accent" />
            Rezept
          </Link>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 h-11 text-sm text-zinc-200"
            onClick={enableMealReminder}
          >
            <Bell className="h-4 w-4 text-accent" />
            Erinnerung
          </button>
          <Link
            href="/nutrition?add=LUNCH"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 h-11 text-sm text-zinc-200"
          >
            <Store className="h-4 w-4 text-accent" />
            Restaurant
          </Link>
        </div>
        <p className="text-[10px] text-zinc-600">
          Favoriten & Zuletzt verwendet findest du im Lebensmittel-Dialog (+).
        </p>
      </PremiumCard>

      <PremiumCard className="space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-white">Einkaufsliste</h3>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Artikel hinzufügen"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addManual();
            }}
            className="h-10"
          />
          <Button type="button" size="sm" variant="secondary" onClick={addManual}>
            +
          </Button>
        </div>
        <ul className="space-y-1.5 max-h-40 overflow-y-auto">
          {list.length === 0 && (
            <li className="text-xs text-zinc-500">Noch leer — aus Plan oder Barcode füllen</li>
          )}
          {list.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-lg ${
                  item.done ? "text-zinc-600 line-through" : "text-zinc-200"
                }`}
              >
                {item.done ? "✓ " : "○ "}
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </PremiumCard>
    </div>
  );
});
