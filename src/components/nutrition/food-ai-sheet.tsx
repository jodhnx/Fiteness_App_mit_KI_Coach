"use client";

import {
  memo,
  useCallback,
  useEffect,
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
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  FoodAIErrorCode,
  FoodAIItem,
  FoodAIResult,
} from "@/lib/food/food-ai-schema";
import { foodAiTotals } from "@/lib/food/food-ai-schema";
import {
  FoodImagePrepareError,
  prepareFoodImageForAi,
} from "@/lib/food/prepare-food-image";
import { mealTypeForHour } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";

type Props = {
  open: boolean;
  onClose: () => void;
  onTrack: (items: FoodAIItem[], mealType: MealType) => Promise<void>;
  /** Opens manual add flow (search / quick entry) instead of silent close */
  onManualAdd?: () => void;
};

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Frühstück" },
  { value: "LUNCH", label: "Mittagessen" },
  { value: "DINNER", label: "Abendessen" },
  { value: "SNACK", label: "Snacks" },
];

type Phase =
  | "idle"
  | "preview"
  | "preparing"
  | "analyzing"
  | "result"
  | "tracking"
  | "error";

function MacroRow({
  label,
  value,
  unit = "g",
  accent = false,
}: {
  label: string;
  value: number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-zinc-400">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          accent ? "text-accent" : "text-zinc-900 dark:text-white"
        )}
      >
        {value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} {unit}
      </span>
    </div>
  );
}

function parsePositiveNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
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
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(item.name);
  const [grams, setGrams] = useState(String(item.estimatedGrams));
  const [calories, setCalories] = useState(String(item.calories));
  const [protein, setProtein] = useState(String(item.proteinG));
  const [carbs, setCarbs] = useState(String(item.carbsG));
  const [fat, setFat] = useState(String(item.fatG));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lowConfidence =
    item.confidence != null && item.confidence < 0.55;

  const commitGrams = (raw: string) => {
    setGrams(raw);
    const n = parsePositiveNumber(raw);
    if (n == null) {
      setErrors((e) => ({
        ...e,
        grams: "Bitte eine Menge größer als 0 eingeben.",
      }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.grams;
      return next;
    });
    const baseG = item.baseGrams > 0 ? item.baseGrams : item.estimatedGrams;
    if (baseG > 0) {
      const ratio = n / baseG;
      const next: FoodAIItem = {
        ...item,
        estimatedGrams: Math.round(n),
        calories: Math.round(item.baseCalories * ratio),
        proteinG: Number((item.baseProteinG * ratio).toFixed(1)),
        carbsG: Number((item.baseCarbsG * ratio).toFixed(1)),
        fatG: Number((item.baseFatG * ratio).toFixed(1)),
      };
      setCalories(String(next.calories));
      setProtein(String(next.proteinG));
      setCarbs(String(next.carbsG));
      setFat(String(next.fatG));
      onChange(next);
    }
  };

  const commitField = (
    field: "name" | "calories" | "proteinG" | "carbsG" | "fatG",
    raw: string
  ) => {
    if (field === "name") {
      setName(raw);
      const trimmed = raw.trim();
      if (!trimmed) {
        setErrors((e) => ({ ...e, name: "Name darf nicht leer sein." }));
        return;
      }
      setErrors((e) => {
        const next = { ...e };
        delete next.name;
        return next;
      });
      onChange({ ...item, name: trimmed.slice(0, 80) });
      return;
    }

    const setters = {
      calories: setCalories,
      proteinG: setProtein,
      carbsG: setCarbs,
      fatG: setFat,
    } as const;
    setters[field](raw);

    const n =
      field === "calories"
        ? parseNonNegativeNumber(raw)
        : parseNonNegativeNumber(raw);
    if (n == null) {
      setErrors((e) => ({
        ...e,
        [field]:
          field === "calories"
            ? "Bitte gültige Kalorien eingeben."
            : "Bitte einen gültigen Wert eingeben.",
      }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });

    if (field === "calories") {
      onChange({
        ...item,
        calories: Math.round(n),
        baseCalories: Math.round(n),
        baseGrams: item.estimatedGrams,
        baseProteinG: item.proteinG,
        baseCarbsG: item.carbsG,
        baseFatG: item.fatG,
      });
    } else {
      const rounded = Number(n.toFixed(1));
      const patch: Partial<FoodAIItem> = { [field]: rounded };
      onChange({
        ...item,
        ...patch,
        baseGrams: item.estimatedGrams,
        baseCalories: item.calories,
        baseProteinG: field === "proteinG" ? rounded : item.proteinG,
        baseCarbsG: field === "carbsG" ? rounded : item.carbsG,
        baseFatG: field === "fatG" ? rounded : item.fatG,
      });
    }
  };

  const inputCls =
    "min-h-11 w-full rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 px-3 py-2 tabular-nums shadow-sm focus:outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:shadow-none";

  return (
    <div className="py-3 border-b border-zinc-200/80 last:border-0 space-y-2 dark:border-zinc-800/70">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate dark:text-white">
            {item.name}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {item.estimatedGrams} g · {item.calories} kcal · {item.proteinG}g P ·{" "}
            {item.carbsG}g C · {item.fatG}g F
          </p>
          {typeof item.confidence === "number" ? (
            <p
              className={`text-[11px] mt-1 ${
                lowConfidence ? "text-amber-400/90" : "text-zinc-500"
              }`}
            >
              {lowConfidence
                ? `Unsicher (${Math.round(item.confidence * 100)}%) — bitte Werte prüfen.`
                : `Erkennung ${Math.round(item.confidence * 100)}%`}
            </p>
          ) : lowConfidence ? (
            <p className="text-[11px] text-amber-400/90 mt-1">
              Schätzung — bitte Werte prüfen.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-h-11 min-w-11 rounded-xl text-zinc-500 hover:text-zinc-900 inline-flex items-center justify-center dark:text-zinc-400 dark:hover:text-white"
          aria-label="Bearbeiten"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 min-w-11 rounded-xl text-zinc-600 hover:text-red-400 inline-flex items-center justify-center"
          aria-label="Entfernen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!expanded && (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`grams-${item.id}`}>
            Menge in Gramm
          </label>
          <input
            id={`grams-${item.id}`}
            inputMode="decimal"
            autoComplete="off"
            value={grams}
            onChange={(e) => commitGrams(e.target.value)}
            className={cn(inputCls, "w-24 text-right")}
          />
          <span className="text-xs text-zinc-500">g</span>
        </div>
      )}

      {expanded && (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-[11px] text-zinc-500 mb-1 block">Name</label>
            <input
              inputMode="text"
              autoComplete="off"
              value={name}
              onChange={(e) => commitField("name", e.target.value)}
              className={inputCls}
            />
            {errors.name ? (
              <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Gramm</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={grams}
              onChange={(e) => commitGrams(e.target.value)}
              className={inputCls}
            />
            {errors.grams ? (
              <p className="text-[11px] text-red-400 mt-1">{errors.grams}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">kcal</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={calories}
              onChange={(e) => commitField("calories", e.target.value)}
              className={inputCls}
            />
            {errors.calories ? (
              <p className="text-[11px] text-red-400 mt-1">{errors.calories}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Protein (g)</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={protein}
              onChange={(e) => commitField("proteinG", e.target.value)}
              className={inputCls}
            />
            {errors.proteinG ? (
              <p className="text-[11px] text-red-400 mt-1">{errors.proteinG}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Carbs (g)</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={carbs}
              onChange={(e) => commitField("carbsG", e.target.value)}
              className={inputCls}
            />
            {errors.carbsG ? (
              <p className="text-[11px] text-red-400 mt-1">{errors.carbsG}</p>
            ) : null}
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-zinc-500 mb-1 block">Fett (g)</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={fat}
              onChange={(e) => commitField("fatG", e.target.value)}
              className={inputCls}
            />
            {errors.fatG ? (
              <p className="text-[11px] text-red-400 mt-1">{errors.fatG}</p>
            ) : null}
          </div>
        </div>
      )}
      {errors.grams && !expanded ? (
        <p className="text-[11px] text-red-400">{errors.grams}</p>
      ) : null}
    </div>
  );
}

function userMessageForError(
  code: FoodAIErrorCode | undefined,
  fallback: string
): { title: string; body: string; kind: "no_food" | "invalid" | "api" } {
  switch (code) {
    case "empty":
      return {
        title: "Kein Lebensmittel erkannt",
        body:
          fallback ||
          "Wir konnten auf dem Foto kein Lebensmittel zuverlässig erkennen.",
        kind: "no_food",
      };
    case "invalid_image":
      return {
        title: "Ungültiges Bild",
        body: fallback || "Dieses Bild konnte nicht verarbeitet werden.",
        kind: "invalid",
      };
    case "rate_limit":
      return {
        title: "Zu viele Anfragen",
        body: fallback || "Bitte kurz warten und erneut versuchen.",
        kind: "api",
      };
    case "timeout":
      return {
        title: "Zeitüberschreitung",
        body: "Foto konnte nicht analysiert werden. Bitte erneut versuchen.",
        kind: "api",
      };
    case "network":
      return {
        title: "Keine Verbindung",
        body:
          fallback ||
          "Netzwerkfehler — bitte Verbindung prüfen und erneut versuchen.",
        kind: "api",
      };
    case "provider":
    case "openai_error":
      return {
        title: "Analyse fehlgeschlagen",
        body:
          fallback ||
          "Der KI-Dienst konnte das Foto gerade nicht auswerten. Bitte erneut versuchen.",
        kind: "api",
      };
    case "missing_key":
      return {
        title: "Food AI nicht verfügbar",
        body: fallback || "Food AI ist nicht konfiguriert.",
        kind: "api",
      };
    case "unauthorized":
      return {
        title: "Nicht angemeldet",
        body: "Bitte erneut anmelden und nochmal versuchen.",
        kind: "api",
      };
    default:
      return {
        title: "Foto konnte nicht analysiert werden",
        body: fallback || "Foto konnte nicht analysiert werden.",
        kind: "api",
      };
  }
}

export const FoodAISheet = memo(function FoodAISheet({
  open,
  onClose,
  onTrack,
  onManualAdd,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const trackLockRef = useRef(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<FoodAIResult | null>(null);
  const [editedItems, setEditedItems] = useState<FoodAIItem[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(() =>
    mealTypeForHour()
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [errorTitle, setErrorTitle] = useState("Foto konnte nicht analysiert werden");
  const [errorKind, setErrorKind] = useState<"no_food" | "invalid" | "api">(
    "api"
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
  }, []);

  const reset = useCallback(() => {
    analyzeAbortRef.current?.abort();
    analyzeAbortRef.current = null;
    trackLockRef.current = false;
    setPhase("idle");
    setResult(null);
    setEditedItems([]);
    setErrorMsg("");
    setErrorTitle("Foto konnte nicht analysiert werden");
    setErrorKind("api");
    setTrackError(null);
    fileRef.current = null;
    revokePreview();
    setSelectedMeal(mealTypeForHour());
  }, [revokePreview]);

  useEffect(() => {
    return () => {
      analyzeAbortRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const setPreviewFromFile = useCallback(
    (file: File) => {
      revokePreview();
      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setPreview(objectUrl);
      fileRef.current = file;
      setPhase("preview");
      setResult(null);
      setEditedItems([]);
      setErrorMsg("");
      setTrackError(null);
    },
    [revokePreview]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const mime = (file.type || "").toLowerCase();
        const okMime =
          mime.startsWith("image/") ||
          /\.(jpe?g|png|webp)$/i.test(file.name);
        if (!okMime) {
          setPhase("error");
          setErrorKind("invalid");
          setErrorTitle("Ungültiges Bild");
          setErrorMsg("Dieses Bild konnte nicht verarbeitet werden.");
          return;
        }
        if (file.size > 12 * 1024 * 1024) {
          setPhase("error");
          setErrorKind("invalid");
          setErrorTitle("Bild zu groß");
          setErrorMsg("Bild zu groß (max. 12 MB). Bitte ein kleineres Foto wählen.");
          return;
        }
        setPreviewFromFile(file);
      } catch {
        setPhase("error");
        setErrorKind("invalid");
        setErrorTitle("Ungültiges Bild");
        setErrorMsg("Dieses Bild konnte nicht verarbeitet werden.");
      }
    },
    [setPreviewFromFile]
  );

  const runAnalyze = useCallback(async () => {
    const source = fileRef.current;
    if (!source) return;

    analyzeAbortRef.current?.abort();
    const ac = new AbortController();
    analyzeAbortRef.current = ac;
    let timedOut = false;
    // Slightly above server OpenAI abort (45s) so server timeout can win first.
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, 55_000);

    setPhase("preparing");
    setErrorMsg("");
    setTrackError(null);

    try {
      let prepared: File;
      try {
        prepared = await prepareFoodImageForAi(source);
      } catch (err) {
        if (ac.signal.aborted) return;
        const msg =
          err instanceof FoodImagePrepareError
            ? err.message
            : "Dieses Bild konnte nicht verarbeitet werden.";
        setPhase("error");
        setErrorKind("invalid");
        setErrorTitle("Ungültiges Bild");
        setErrorMsg(msg);
        return;
      }

      if (ac.signal.aborted) return;
      setPhase("analyzing");

      const fd = new FormData();
      fd.append("image", prepared);
      const res = await fetch("/api/nutrition/food-ai", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
        signal: ac.signal,
      });

      if (ac.signal.aborted) return;

      if (res.status === 401) {
        const mapped = userMessageForError("unauthorized", "");
        setPhase("error");
        setErrorKind(mapped.kind);
        setErrorTitle(mapped.title);
        setErrorMsg(mapped.body);
        return;
      }
      if (res.status === 429) {
        const mapped = userMessageForError("rate_limit", "");
        setPhase("error");
        setErrorKind(mapped.kind);
        setErrorTitle(mapped.title);
        setErrorMsg(mapped.body);
        return;
      }
      if (!res.ok) {
        let bodyMsg = "";
        let bodyCode: FoodAIErrorCode | undefined;
        try {
          const j = (await res.json()) as {
            error?: string;
            errorCode?: FoodAIErrorCode;
          };
          bodyMsg = j.error ?? "";
          bodyCode = j.errorCode;
        } catch {
          /* ignore */
        }
        const mapped = userMessageForError(
          bodyCode ??
            (res.status >= 500 ? "server_error" : "provider"),
          bodyMsg
        );
        setPhase("error");
        setErrorKind(mapped.kind);
        setErrorTitle(mapped.title);
        setErrorMsg(mapped.body);
        return;
      }

      const data = (await res.json()) as FoodAIResult;
      const normalized = (data.items ?? []).map((it) => ({
        ...it,
        confidence: it.confidence ?? null,
        brand: it.brand ?? null,
        baseGrams: it.baseGrams ?? it.estimatedGrams,
        baseCalories: it.baseCalories ?? it.calories,
        baseProteinG: it.baseProteinG ?? it.proteinG,
        baseCarbsG: it.baseCarbsG ?? it.carbsG,
        baseFatG: it.baseFatG ?? it.fatG,
      }));

      if (data.errorCode || normalized.length === 0) {
        const mapped = userMessageForError(
          data.errorCode ?? "empty",
          data.disclaimer || ""
        );
        setResult({ ...data, items: normalized });
        setEditedItems([]);
        setPhase("error");
        setErrorKind(mapped.kind);
        setErrorTitle(mapped.title);
        setErrorMsg(mapped.body);
        return;
      }

      setResult({ ...data, items: normalized });
      setEditedItems(normalized);
      setSelectedMeal(mealTypeForHour());
      setPhase("result");
    } catch (err) {
      if (ac.signal.aborted) {
        if (timedOut) {
          const mapped = userMessageForError("timeout", "");
          setPhase("error");
          setErrorKind(mapped.kind);
          setErrorTitle(mapped.title);
          setErrorMsg(mapped.body);
        }
        return;
      }
      if (err instanceof DOMException && err.name === "AbortError") return;
      const mapped = userMessageForError("network", "");
      setPhase("error");
      setErrorKind(mapped.kind);
      setErrorTitle(mapped.title);
      setErrorMsg(mapped.body);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  const handleTrack = useCallback(async () => {
    if (!editedItems.length || trackLockRef.current) return;
    for (const it of editedItems) {
      if (!it.name.trim() || !(it.estimatedGrams > 0)) {
        setTrackError("Bitte alle Mengen und Namen prüfen.");
        return;
      }
    }
    trackLockRef.current = true;
    setPhase("tracking");
    setTrackError(null);
    try {
      await onTrack(editedItems, selectedMeal);
      handleClose();
    } catch {
      trackLockRef.current = false;
      setPhase("result");
      setTrackError(
        "Speichern fehlgeschlagen. Bitte erneut versuchen — nichts wurde still verworfen."
      );
    }
  }, [editedItems, selectedMeal, onTrack, handleClose]);

  const updateItem = useCallback((id: string, updated: FoodAIItem) => {
    setEditedItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  }, []);

  const totals = foodAiTotals(editedItems);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#f4f7fa] dark:bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label="Food AI Fotoanalyse"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-zinc-200 dark:bg-zinc-950/95 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-accent/12 border border-accent/20 flex items-center justify-center dark:bg-cyan-500/15 dark:border-white/10">
            <Camera className="h-4 w-4 text-accent dark:text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900 leading-tight dark:text-white">
              Food AI
            </p>
            <p className="text-[10px] text-zinc-500 leading-tight">
              Essen analysieren
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="h-11 w-11 rounded-2xl flex items-center justify-center bg-zinc-100 border border-zinc-200 text-zinc-600 active:bg-zinc-200 transition-colors dark:bg-zinc-800/80 dark:border-zinc-700/50 dark:text-zinc-300 dark:active:bg-zinc-700"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-4 space-y-4 max-w-lg mx-auto w-full pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Hidden file inputs — always mounted */}
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
            accept="image/jpeg,image/png,image/webp,image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {phase === "idle" && (
            <div className="flex flex-col items-center gap-5 pt-6">
              <div className="h-20 w-20 rounded-3xl bg-accent/12 border border-accent/20 flex items-center justify-center dark:bg-cyan-500/15 dark:border-white/10">
                <Camera className="h-10 w-10 text-accent dark:text-cyan-400" />
              </div>
              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Essen fotografieren
                </h2>
                <p className="text-sm text-zinc-500 max-w-xs leading-relaxed dark:text-zinc-400">
                  Foto aufnehmen oder aus der Galerie wählen — danach analysieren
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  className="w-full min-h-11 h-12 rounded-2xl bg-accent text-white font-semibold text-base flex items-center justify-center gap-2.5 active:opacity-90 transition-opacity"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="h-5 w-5" />
                  Foto aufnehmen
                </button>
                <button
                  type="button"
                  className="w-full min-h-11 h-12 rounded-2xl bg-white border border-zinc-200 text-zinc-800 font-medium text-base flex items-center justify-center gap-2.5 shadow-sm active:bg-zinc-50 transition-colors dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:shadow-none dark:active:opacity-80"
                  onClick={() => galleryRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                  Aus Galerie / Datei
                </button>
              </div>

              <p className="text-[11px] text-zinc-600 text-center">
                Die KI liefert Schätzwerte — bitte vor dem Speichern prüfen
              </p>
            </div>
          )}

          {phase === "preview" && preview && (
            <div className="flex flex-col gap-4">
              <div className="w-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Ausgewähltes Foto"
                  className="w-full max-h-[42vh] object-contain bg-zinc-900"
                />
              </div>
              <button
                type="button"
                className="w-full min-h-11 h-12 rounded-2xl bg-accent text-white font-semibold text-base flex items-center justify-center gap-2"
                onClick={() => void runAnalyze()}
              >
                Analyse starten
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-2xl bg-white border border-zinc-200 text-zinc-800 text-sm font-medium shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:shadow-none"
                  onClick={() => galleryRef.current?.click()}
                >
                  Foto ändern
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-2xl bg-white border border-zinc-200 text-zinc-600 text-sm font-medium shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:shadow-none"
                  onClick={reset}
                >
                  Foto entfernen
                </button>
              </div>
            </div>
          )}

          {(phase === "preparing" || phase === "analyzing") && (
            <div className="flex flex-col items-center gap-5 pt-4">
              {preview && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Analysiertes Bild"
                    className="w-full max-h-48 object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-10 w-10 text-accent animate-spin" />
                <p className="text-base font-semibold text-zinc-900 dark:text-white">
                  {phase === "preparing"
                    ? "Bild wird vorbereitet …"
                    : "Lebensmittel werden analysiert …"}
                </p>
                <p className="text-sm text-zinc-500 text-center">
                  Bitte kurz warten — keine Schätzwerte werden vorab angezeigt
                </p>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 pt-4">
              {preview && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 opacity-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Bild"
                    className="w-full max-h-40 object-cover"
                  />
                </div>
              )}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 w-full flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {errorTitle}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed dark:text-zinc-400">
                    {errorMsg}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 w-full">
                {errorKind === "no_food" ? (
                  <>
                    <Button
                      className="w-full min-h-11 h-12 rounded-2xl"
                      onClick={() => {
                        revokePreview();
                        fileRef.current = null;
                        setPhase("idle");
                        setErrorMsg("");
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Anderes Foto
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full min-h-11 h-12 rounded-2xl"
                      onClick={() => {
                        handleClose();
                        onManualAdd?.();
                      }}
                    >
                      Manuell hinzufügen
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="w-full min-h-11 h-12 rounded-2xl"
                      onClick={() => {
                        if (fileRef.current && preview) {
                          void runAnalyze();
                        } else {
                          reset();
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Erneut versuchen
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full min-h-11 h-12 rounded-2xl"
                      onClick={() => {
                        setPhase("preview");
                        setErrorMsg("");
                        if (!preview) {
                          galleryRef.current?.click();
                        } else {
                          galleryRef.current?.click();
                        }
                      }}
                    >
                      Foto ändern
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {(phase === "result" || phase === "tracking") && result && (
            <>
              {preview && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Analysiertes Bild"
                    className="w-full max-h-36 object-cover"
                  />
                </div>
              )}

              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-3 py-2 flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {result.disclaimer}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/80 dark:shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Erkannte Lebensmittel
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("preview");
                      setResult(null);
                      setEditedItems([]);
                    }}
                    className="min-h-11 px-2 text-[11px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-0.5 dark:hover:text-white"
                    disabled={phase === "tracking"}
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
                        setEditedItems((prev) =>
                          prev.filter((it) => it.id !== item.id)
                        )
                      }
                    />
                  ))}
                  {editedItems.length === 0 && (
                    <p className="text-xs text-zinc-400 py-3 text-center">
                      Mindestens ein Lebensmittel nötig — oder Foto neu
                      analysieren.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Gesamt (Vorschau)
                </h3>
                <MacroRow
                  label="Kalorien"
                  value={Math.round(totals.calories)}
                  unit="kcal"
                  accent
                />
                <MacroRow
                  label="Protein"
                  value={Number(totals.proteinG.toFixed(1))}
                />
                <MacroRow
                  label="Kohlenhydrate"
                  value={Number(totals.carbsG.toFixed(1))}
                />
                <MacroRow
                  label="Fett"
                  value={Number(totals.fatG.toFixed(1))}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Mahlzeit auswählen
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MEAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={phase === "tracking"}
                      onClick={() => setSelectedMeal(opt.value)}
                      className={cn(
                        "min-h-11 rounded-xl border py-2.5 text-sm font-medium transition-colors flex items-center justify-center",
                        selectedMeal === opt.value
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-zinc-200 bg-white text-zinc-600 shadow-sm active:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400 dark:shadow-none dark:active:border-zinc-600"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {trackError ? (
                <p className="text-sm text-red-400 text-center">{trackError}</p>
              ) : null}

              <div className="flex gap-3 pb-4">
                <Button
                  className="flex-1 min-h-11 h-12 rounded-2xl text-base"
                  onClick={() => void handleTrack()}
                  disabled={phase === "tracking" || editedItems.length === 0}
                >
                  {phase === "tracking" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Speichern …
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Speichern
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-11 h-12 px-4 rounded-2xl"
                  onClick={handleClose}
                  disabled={phase === "tracking"}
                >
                  Abbrechen
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
