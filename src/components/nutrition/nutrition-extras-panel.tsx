"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ScanBarcode,
  Camera,
  ChefHat,
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
import {
  mealRemindersEnabled,
  setMealRemindersEnabled,
} from "@/lib/meal-reminders";
import { ShoppingCart } from "lucide-react";

/** Compact quick-capture tools (no shopping — that lives at page end). */
export const NutritionExtrasPanel = memo(function NutritionExtrasPanel({
  onOpenFoodAI,
}: {
  onOpenFoodAI?: () => void;
}) {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [busy, setBusy] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);

  useEffect(() => {
    setRemindersOn(mealRemindersEnabled());
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
      const list = loadShoppingList();
      saveShoppingList([...list, { id: crypto.randomUUID(), name, done: false }]);
      router.push(`/nutrition?add=LUNCH&q=${encodeURIComponent(name)}`);
    } catch {
      toast.error("Barcode-Lookup fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }, [barcode, router]);

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
      const name = data.name ? String(data.name) : null;
      toast.success(data.suggestion ?? "Lebensmittel erkannt — bitte bestätigen");
      if (name) {
        const list = loadShoppingList();
        saveShoppingList([...list, { id: crypto.randomUUID(), name, done: false }]);
        router.push(`/nutrition?add=LUNCH&q=${encodeURIComponent(name)}`);
      } else {
        router.push("/nutrition?add=LUNCH");
      }
    } catch {
      toast.error("Foto-Analyse nicht verfügbar");
    } finally {
      setBusy(false);
    }
  }

  function toggleMealReminder() {
    hapticTap();
    if (remindersOn) {
      setMealRemindersEnabled(false);
      setRemindersOn(false);
      toast.message("Essenserinnerungen aus");
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.message("Benachrichtigungen nicht unterstützt");
      return;
    }
    void Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        setMealRemindersEnabled(true);
        setRemindersOn(true);
        toast.success("Erinnerungen um 8:00, 12:30 und 18:30 (Tab offen)");
        try {
          new Notification("NEXFORM", {
            body: "Essenserinnerungen aktiv — wir melden uns zu den Mahlzeiten.",
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
    <PremiumCard padding="sm" className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-none">
        {onOpenFoodAI ? (
          <button
            type="button"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs text-zinc-200 active:bg-zinc-800"
            onClick={() => {
              hapticTap();
              onOpenFoodAI();
            }}
          >
            <Camera className="h-3.5 w-3.5 text-accent" />
            KI-Foto
          </button>
        ) : (
          <label className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs text-zinc-200 cursor-pointer active:bg-zinc-800">
            <Camera className="h-3.5 w-3.5 text-accent" />
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
        )}
        <Link
          href="/nutrition/saved-meals/new"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs text-zinc-200"
        >
          <ChefHat className="h-3.5 w-3.5 text-accent" />
          Mahlzeit
        </Link>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 h-9 px-3 text-xs text-zinc-200"
          onClick={toggleMealReminder}
        >
          <Bell className={`h-3.5 w-3.5 ${remindersOn ? "text-emerald-400" : "text-accent"}`} />
          {remindersOn ? "Erinnerung an" : "Erinnerung"}
        </button>
        <Link
          href="/nutrition?add=LUNCH&q=Pizza"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 h-9 px-3 text-xs text-zinc-200"
        >
          <Store className="h-3.5 w-3.5 text-accent" />
          Restaurant
        </Link>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Barcode / EAN"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="h-9 text-sm"
          inputMode="numeric"
        />
        <Button
          type="button"
          variant="premium"
          size="sm"
          className="h-9 shrink-0"
          disabled={busy}
          onClick={() => void lookupBarcode()}
        >
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>
    </PremiumCard>
  );
});

/** Shopping list — place at end of nutrition page. */
export const NutritionShoppingList = memo(function NutritionShoppingList() {
  const [list, setList] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setList(loadShoppingList());
  }, []);

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

  return (
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
  );
});
