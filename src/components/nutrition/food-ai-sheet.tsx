"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Camera,
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FoodAIResult, FoodAIItem } from "@/app/api/nutrition/food-ai/route";
import type { MealType } from "@prisma/client";

type Props = {
  open: boolean;
  onClose: () => void;
  onTrack: (items: FoodAIItem[], mealType: MealType) => Promise<void>;
};

const MEAL_OPTIONS: { value: MealType; label: string; emoji: string }[] = [
  { value: "BREAKFAST", label: "Frühstück", emoji: "🍳" },
  { value: "LUNCH", label: "Mittagessen", emoji: "🍽" },
  { value: "DINNER", label: "Abendessen", emoji: "🌙" },
  { value: "SNACK", label: "Snack", emoji: "🍫" },
];

type Phase = "idle" | "analyzing" | "result" | "tracking" | "error";

function MacroRow({ label, value, unit = "g", accent = false }: {
  label: string;
  value: number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", accent ? "text-accent" : "text-white")}>
        {value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} {unit}
      </span>
    </div>
  );
}

function ItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: FoodAIItem;
  onChange: (updated: FoodAIItem) => void;
  onRemove: () => void;
}) {
  const [grams, setGrams] = useState(String(item.estimatedGrams));

  const handleGramsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGrams(val);
    const n = parseFloat(val);
    const baseG = item.baseGrams > 0 ? item.baseGrams : item.estimatedGrams;
    if (!isNaN(n) && n > 0 && baseG > 0) {
      const ratio = n / baseG;
      onChange({
        ...item,
        estimatedGrams: Math.round(n),
        calories: Math.round(item.baseCalories * ratio),
        proteinG: Number((item.baseProteinG * ratio).toFixed(1)),
        carbsG: Number((item.baseCarbsG * ratio).toFixed(1)),
        fatG: Number((item.baseFatG * ratio).toFixed(1)),
      });
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-zinc-800/70 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          {item.calories} kcal · {item.proteinG}g P · {item.carbsG}g C · {item.fatG}g F
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          value={grams}
          onChange={handleGramsChange}
          className="w-16 rounded-xl bg-zinc-800 border border-zinc-700 text-right text-sm text-white px-2 py-1.5 tabular-nums focus:outline-none focus:ring-1 focus:ring-accent"
          min="1"
          max="2000"
        />
        <span className="text-xs text-zinc-500">g</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 h-8 w-8 rounded-lg text-zinc-600 hover:text-red-400 flex items-center justify-center"
          aria-label="Entfernen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export const FoodAISheet = memo(function FoodAISheet({ open, onClose, onTrack }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
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
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
  }, [preview]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const analyzeFile = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FoodAIResult = await res.json();
      // Ensure base macros exist for older responses
      const normalized = (data.items ?? []).map((it) => ({
        ...it,
        baseGrams: it.baseGrams ?? it.estimatedGrams,
        baseCalories: it.baseCalories ?? it.calories,
        baseProteinG: it.baseProteinG ?? it.proteinG,
        baseCarbsG: it.baseCarbsG ?? it.carbsG,
        baseFatG: it.baseFatG ?? it.fatG,
      }));
      setResult({ ...data, items: normalized });
      setEditedItems(normalized);
      if (normalized.length === 0) {
        setPhase("error");
        setErrorMsg(
          data.disclaimer ||
            "Keine Lebensmittel erkannt – bitte erneut versuchen oder manuell hinzufügen."
        );
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
      if (file) void analyzeFile(file);
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
    setEditedItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
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
      className="fixed inset-0 z-[70] flex flex-col bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label="Food AI Fotoanalyse"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Sticky header — always visible, safe-area aware */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-zinc-950/95 backdrop-blur border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
            <Camera className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Food AI</p>
            <p className="text-[10px] text-zinc-500 leading-tight">Essen analysieren</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="h-10 w-10 rounded-2xl flex items-center justify-center bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 active:bg-zinc-700 transition-colors"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 max-w-lg mx-auto w-full pb-8">

          {/* ── IDLE ── */}
          {phase === "idle" && (
            <div className="flex flex-col items-center gap-5 pt-6">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
                <Camera className="h-10 w-10 text-cyan-400" />
              </div>
              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-bold text-white">Essen fotografieren</h2>
                <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
                  Die KI erkennt Lebensmittel und schätzt Portionsgrößen, Kalorien und Makros
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  className="w-full h-12 rounded-2xl bg-accent text-black font-semibold text-base flex items-center justify-center gap-2.5 active:opacity-90 transition-opacity"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="h-5 w-5" />
                  Foto aufnehmen
                </button>
                <button
                  type="button"
                  className="w-full h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-medium text-base flex items-center justify-center gap-2.5 active:opacity-80 transition-opacity"
                  onClick={() => galleryRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5 text-zinc-400" />
                  Aus Galerie wählen
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <p className="text-[11px] text-zinc-600 text-center">
                Die KI liefert Schätzwerte – keine exakten Nährwerte
              </p>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {phase === "analyzing" && (
            <div className="flex flex-col items-center gap-5 pt-4">
              {preview && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Analysiertes Bild"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-zinc-800" />
                  <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                  <Camera className="absolute inset-0 m-auto h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-base font-semibold text-white">Essen wird analysiert …</p>
                <p className="text-sm text-zinc-500">KI erkennt Lebensmittel und Portionen</p>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 pt-4">
              {preview && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 opacity-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Bild" className="w-full h-40 object-cover" />
                </div>
              )}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 w-full flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Foto konnte nicht analysiert werden</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 w-full">
                <Button className="w-full h-12 rounded-2xl" onClick={reset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
                <Button
                  variant="secondary"
                  className="w-full h-12 rounded-2xl"
                  onClick={handleClose}
                >
                  Manuell hinzufügen
                </Button>
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {(phase === "result" || phase === "tracking") && result && (
            <>
              {preview && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Analysiertes Bild" className="w-full h-36 object-cover" />
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-3 py-2 flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-relaxed">{result.disclaimer}</p>
              </div>

              {/* Items */}
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Erkannte Lebensmittel
                  </h3>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[11px] text-zinc-500 hover:text-white flex items-center gap-0.5"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Neu
                  </button>
                </div>
                <div>
                  {editedItems.map((item) => (
                    <ItemEditor
                      key={item.id}
                      item={item}
                      onChange={(updated) => updateItem(item.id, updated)}
                      onRemove={() =>
                        setEditedItems((prev) => prev.filter((it) => it.id !== item.id))
                      }
                    />
                  ))}
                  {editedItems.length === 0 && (
                    <p className="text-xs text-zinc-400 py-3 text-center">
                      Mindestens ein Lebensmittel nötig — oder Foto neu analysieren.
                    </p>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Gesamt (geschätzt)
                </h3>
                <MacroRow label="Kalorien" value={Math.round(totals.cal)} unit="kcal" accent />
                <MacroRow label="Protein" value={Number(totals.prot.toFixed(1))} />
                <MacroRow label="Kohlenhydrate" value={Number(totals.carbs.toFixed(1))} />
                <MacroRow label="Fett" value={Number(totals.fat.toFixed(1))} />
              </div>

              {/* Meal selector */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Mahlzeit auswählen
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MEAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedMeal(opt.value)}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                        selectedMeal === opt.value
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-zinc-700 bg-zinc-900/50 text-zinc-400 active:border-zinc-600"
                      )}
                    >
                      <span>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Track + cancel */}
              <div className="flex gap-3 pb-4">
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
                  onClick={handleClose}
                  disabled={phase === "tracking"}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
