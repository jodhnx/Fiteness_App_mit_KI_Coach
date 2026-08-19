"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Camera, CheckCircle2, Loader2, RefreshCw, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FoodAIResult, FoodAIItem } from "@/app/api/nutrition/food-ai/route";
import type { MealType } from "@prisma/client";

type Props = {
  open: boolean;
  onClose: () => void;
  onTrack: (items: FoodAIItem[], mealType: MealType) => Promise<void>;
};

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Frühstück" },
  { value: "LUNCH", label: "Mittagessen" },
  { value: "DINNER", label: "Abendessen" },
  { value: "SNACK", label: "Snack" },
];

function MacroRow({ label, value, unit = "g", accent = false }: {
  label: string;
  value: number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className={cn("font-semibold tabular-nums", accent ? "text-accent" : "text-white")}>
        {value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} {unit}
      </span>
    </div>
  );
}

function ItemEditor({
  item,
  onChange,
}: {
  item: FoodAIItem;
  onChange: (updated: FoodAIItem) => void;
}) {
  const [grams, setGrams] = useState(String(item.estimatedGrams));

  const handleGramsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGrams(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      const ratio = n / item.estimatedGrams;
      onChange({
        ...item,
        estimatedGrams: Math.round(n),
        calories: Math.round(item.calories * ratio),
        proteinG: Number((item.proteinG * ratio).toFixed(1)),
        carbsG: Number((item.carbsG * ratio).toFixed(1)),
        fatG: Number((item.fatG * ratio).toFixed(1)),
      });
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-800/70 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.name}</p>
        <p className="text-[11px] text-zinc-500">
          {item.calories} kcal · {item.proteinG}g P · {item.carbsG}g C · {item.fatG}g F
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          value={grams}
          onChange={handleGramsChange}
          className="w-16 rounded-lg bg-zinc-800 border border-zinc-700 text-right text-sm text-white px-2 py-1 tabular-nums"
          min="1"
          max="2000"
        />
        <span className="text-xs text-zinc-500">g</span>
      </div>
    </div>
  );
}

export const FoodAISheet = memo(function FoodAISheet({ open, onClose, onTrack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "result" | "tracking" | "error">("idle");
  const [result, setResult] = useState<FoodAIResult | null>(null);
  const [editedItems, setEditedItems] = useState<FoodAIItem[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("LUNCH");
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setEditedItems([]);
    setErrorMsg("");
    setPreview(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const analyzeFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setPhase("analyzing");
    setResult(null);
    setErrorMsg("");

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/nutrition/food-ai", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data: FoodAIResult = await res.json();
      setResult(data);
      setEditedItems(data.items);
      if (data.items.length === 0) {
        setPhase("error");
        setErrorMsg("Keine Lebensmittel erkannt – bitte manuell hinzufügen.");
      } else {
        setPhase("result");
      }
    } catch {
      setPhase("error");
      setErrorMsg("Analyse fehlgeschlagen – bitte erneut versuchen.");
    }
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void analyzeFile(file);
      e.target.value = "";
    },
    [analyzeFile]
  );

  const handleTrack = useCallback(async () => {
    if (!editedItems.length) return;
    setPhase("tracking");
    try {
      await onTrack(editedItems, selectedMeal);
      handleClose();
    } catch {
      setPhase("result");
    }
  }, [editedItems, selectedMeal, onTrack, handleClose]);

  const updateItem = useCallback((id: string, updated: FoodAIItem) => {
    setEditedItems((prev) =>
      prev.map((it) => (it.id === id ? updated : it))
    );
  }, []);

  const totals = editedItems.reduce(
    (acc, it) => ({
      cal: acc.cal + it.calories,
      prot: acc.prot + it.proteinG,
      carbs: acc.carbs + it.carbsG,
      fat: acc.fat + it.fatG,
    }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-zinc-950/95 backdrop-blur-xl overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Food AI Fotoanalyse"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-zinc-950/90 backdrop-blur border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-accent" />
          <span className="text-base font-bold text-white">Food AI</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Idle phase */}
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 pt-8">
            <div className="h-24 w-24 rounded-3xl bg-accent/10 border border-accent/25 flex items-center justify-center">
              <Camera className="h-10 w-10 text-accent" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white">Essen fotografieren</h2>
              <p className="text-sm text-zinc-400 max-w-xs">
                Die KI analysiert dein Foto und schätzt Kalorien und Makros
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <Button
                className="w-full h-12 rounded-2xl text-base"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-5 w-5 mr-2" />
                Foto aufnehmen
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-[11px] text-zinc-600 text-center">
              Die KI liefert Schätzwerte – keine exakten Nährwerte
            </p>
          </div>
        )}

        {/* Analyzing */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center gap-6 pt-8">
            {preview && (
              <div className="w-full max-h-48 rounded-2xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Analysiertes Bild" className="w-full h-48 object-cover" />
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-base font-medium text-white">Essen wird analysiert …</p>
              <p className="text-sm text-zinc-500">Die KI erkennt Lebensmittel und Portionen</p>
            </div>
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className="flex flex-col items-center gap-6 pt-8">
            {preview && (
              <div className="w-full max-h-48 rounded-2xl overflow-hidden border border-white/10 opacity-60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Analysiertes Bild" className="w-full h-48 object-cover" />
              </div>
            )}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 w-full flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">Nicht erkannt</p>
                <p className="text-xs text-zinc-400 mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="secondary"
                className="flex-1 h-11 rounded-2xl"
                onClick={reset}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Erneut fotografieren
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-2xl"
                onClick={handleClose}
              >
                Manuell hinzufügen
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {(phase === "result" || phase === "tracking") && result && (
          <>
            {preview && (
              <div className="w-full max-h-40 rounded-2xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Analysiertes Bild" className="w-full h-40 object-cover" />
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-3 py-2 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400">{result.disclaimer}</p>
            </div>

            {/* Erkannte Items */}
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                Erkannte Lebensmittel
              </h3>
              <div className="space-y-0">
                {editedItems.map((item) => (
                  <ItemEditor
                    key={item.id}
                    item={item}
                    onChange={(updated) => updateItem(item.id, updated)}
                  />
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
                Gesamt (geschätzt)
              </h3>
              <MacroRow label="Kalorien" value={Math.round(totals.cal)} unit="kcal" accent />
              <MacroRow label="Protein" value={totals.prot} />
              <MacroRow label="Kohlenhydrate" value={totals.carbs} />
              <MacroRow label="Fett" value={totals.fat} />
            </div>

            {/* Meal selector */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Mahlzeit auswählen
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedMeal(opt.value)}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                      selectedMeal === opt.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-8">
              <Button
                className="flex-1 h-12 rounded-2xl text-base"
                onClick={() => void handleTrack()}
                disabled={phase === "tracking" || editedItems.length === 0}
              >
                {phase === "tracking" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gespeichert…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Tracken
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                className="h-12 px-4 rounded-2xl"
                onClick={reset}
                disabled={phase === "tracking"}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
