"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ActivityLevel, NutritionGoal, PlanLevel, TrainingGoal } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/user/avatar-upload";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { resetBodyScroll } from "@/lib/scroll-lock";
import { previewTargetsFromForm } from "@/lib/calorie-target";
import { parseManualCalorieTargetInput } from "@/lib/daily-kcal";
import {
  ONBOARDING_ACTIVITY_OPTIONS,
  ONBOARDING_EXPERIENCE_OPTIONS,
  ONBOARDING_MAIN_GOAL_UI,
  ONBOARDING_NUTRITION_GOAL_OPTIONS,
  ONBOARDING_TRAINING_DAYS,
} from "@/lib/onboarding-options";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

export type ProfileEditForm = {
  name: string;
  username: string;
  email: string;
  age: string;
  weightKg: string;
  heightCm: string;
  gender: string;
  activityLevel: ActivityLevel;
  trainingGoal: TrainingGoal;
  nutritionGoal: NutritionGoal;
  experienceLevel: PlanLevel;
  workoutDaysPerWeek: string;
  calorieTarget: string;
  proteinTargetG: string;
  carbsTargetG: string;
  fatTargetG: string;
  waterTargetMl: string;
  targetWeightKg: string;
  targetWeightDate: string;
  trainingLocation: string;
  countryCode: string;
  bodyFatPct: string;
  muscleMassKg: string;
  neckCm: string;
  chestCm: string;
  waistCm: string;
  hipsCm: string;
};

type FieldErrors = Partial<Record<keyof ProfileEditForm, string>>;

const inputCls =
  "mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 tabular-nums shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:shadow-none";

const selectCls =
  "mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:shadow-none";

function parseDec(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseIntField(raw: string): number | null {
  const t = raw.trim().replace(/[^\d]/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function validateProfileEditForm(draft: ProfileEditForm): FieldErrors {
  const errors: FieldErrors = {};

  const age = parseIntField(draft.age);
  if (draft.age.trim() && (age == null || age < 14 || age > 120)) {
    errors.age = "Alter zwischen 14 und 120 eingeben.";
  }

  const height = parseIntField(draft.heightCm);
  if (draft.heightCm.trim() && (height == null || height < 100 || height > 250)) {
    errors.heightCm = "Größe zwischen 100 und 250 cm eingeben.";
  }

  const weight = parseDec(draft.weightKg);
  if (draft.weightKg.trim() && (weight == null || weight < 30 || weight > 300)) {
    errors.weightKg = "Gewicht zwischen 30 und 300 kg eingeben.";
  }

  if (draft.calorieTarget.trim()) {
    const kcal = parseManualCalorieTargetInput(draft.calorieTarget);
    if (kcal == null) {
      errors.calorieTarget = "Kalorienziel zwischen 800 und 10.000 kcal.";
    }
  }

  for (const [key, label, max] of [
    ["proteinTargetG", "Protein", 1000],
    ["carbsTargetG", "Carbs", 2000],
    ["fatTargetG", "Fett", 500],
  ] as const) {
    const raw = draft[key];
    if (!raw.trim()) continue;
    const n = parseDec(raw);
    if (n == null || n < 0 || n > max) {
      errors[key] = `${label}: gültigen Wert in g eingeben.`;
    }
  }

  if (draft.name.trim() && draft.name.trim().length < 2) {
    errors.name = "Name mindestens 2 Zeichen.";
  }

  return errors;
}

type Props = {
  open: boolean;
  initial: ProfileEditForm;
  userImage: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ProfileEditForm) => Promise<boolean>;
  onImageUpdated: (url: string | null) => void;
};

export const SettingsProfileEditSheet = memo(function SettingsProfileEditSheet({
  open,
  initial,
  userImage,
  saving,
  onClose,
  onSave,
  onImageUpdated,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [macrosTouched, setMacrosTouched] = useState(false);
  const saveLock = useRef(false);
  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setErrors({});
    setMacrosTouched(false);
    saveLock.current = false;
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        resetBodyScroll();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const live = useMemo(() => previewTargetsFromForm(draft), [draft]);

  useEffect(() => {
    if (!open || !live || macrosTouched) return;
    setDraft((d) => {
      const nextCal = String(live.calorieTarget);
      const nextP = String(live.proteinTargetG);
      const nextC = String(live.carbsTargetG);
      const nextF = String(live.fatTargetG);
      if (
        d.calorieTarget === nextCal &&
        d.proteinTargetG === nextP &&
        d.carbsTargetG === nextC &&
        d.fatTargetG === nextF
      ) {
        return d;
      }
      return {
        ...d,
        calorieTarget: nextCal,
        proteinTargetG: nextP,
        carbsTargetG: nextC,
        fatTargetG: nextF,
      };
    });
  }, [
    open,
    macrosTouched,
    live?.calorieTarget,
    live?.proteinTargetG,
    live?.carbsTargetG,
    live?.fatTargetG,
    live,
  ]);

  const patch = useCallback((partial: Partial<ProfileEditForm>) => {
    setDraft((d) => ({ ...d, ...partial }));
  }, []);

  const close = useCallback(() => {
    if (saving) return;
    resetBodyScroll();
    onClose();
  }, [saving, onClose]);

  const handleSave = useCallback(async () => {
    if (saving || saveLock.current) return;
    const nextErrors = validateProfileEditForm(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveLock.current = true;
    try {
      const ok = await onSave(draft);
      if (!ok) saveLock.current = false;
    } catch {
      saveLock.current = false;
    }
  }, [draft, onSave, saving]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[#f4f7fa] dark:bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label="Profil bearbeiten"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <header className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-200 bg-white dark:border-white/[0.06] dark:bg-transparent">
        <button
          type="button"
          onClick={close}
          disabled={saving}
          className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-white"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          Profil bearbeiten
        </h2>
        <Button
          type="button"
          size="sm"
          className="min-h-11 px-4"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Speichern…" : "Speichern"}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-lg px-4 py-4 space-y-5 pb-[max(6rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-center">
            <AvatarUpload
              imageUrl={userImage}
              name={draft.name}
              onUpdated={onImageUpdated}
            />
          </div>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Profil
            </h3>
            <div>
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={inputCls}
                autoComplete="name"
              />
              {errors.name ? (
                <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Alter</Label>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.age}
                  onChange={(e) =>
                    patch({ age: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })
                  }
                  className={inputCls}
                  placeholder="Jahre"
                  aria-invalid={Boolean(errors.age)}
                />
                {errors.age ? (
                  <p className="text-[11px] text-red-400 mt-1">{errors.age}</p>
                ) : null}
              </div>
              <div>
                <Label>Geschlecht</Label>
                <select
                  className={selectCls}
                  value={draft.gender}
                  onChange={(e) => patch({ gender: e.target.value })}
                >
                  <option value="MALE">Männlich</option>
                  <option value="FEMALE">Weiblich</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Größe (cm)</Label>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.heightCm}
                  onChange={(e) =>
                    patch({
                      heightCm: e.target.value.replace(/[^\d]/g, "").slice(0, 3),
                    })
                  }
                  className={inputCls}
                  aria-invalid={Boolean(errors.heightCm)}
                />
                {errors.heightCm ? (
                  <p className="text-[11px] text-red-400 mt-1">{errors.heightCm}</p>
                ) : null}
              </div>
              <div>
                <Label>Gewicht (kg)</Label>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.weightKg}
                  onChange={(e) =>
                    patch({
                      weightKg: e.target.value.replace(/[^\d,.]/g, "").slice(0, 6),
                    })
                  }
                  className={inputCls}
                  aria-invalid={Boolean(errors.weightKg)}
                />
                {errors.weightKg ? (
                  <p className="text-[11px] text-red-400 mt-1">{errors.weightKg}</p>
                ) : null}
              </div>
            </div>
            <div>
              <Label>Aktivitätslevel</Label>
              <select
                className={selectCls}
                value={draft.activityLevel}
                onChange={(e) =>
                  patch({ activityLevel: e.target.value as ActivityLevel })
                }
              >
                {ONBOARDING_ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Ziel
            </h3>
            <div>
              <Label>Ziel</Label>
              <select
                className={selectCls}
                value={draft.nutritionGoal}
                onChange={(e) =>
                  patch({ nutritionGoal: e.target.value as NutritionGoal })
                }
              >
                {ONBOARDING_NUTRITION_GOAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {NUTRITION_GOAL_LABELS[o.value]}
                  </option>
                ))}
              </select>
            </div>
            {live ? (
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Vorschlag aus Profil:{" "}
                <span className="text-zinc-300 tabular-nums">
                  {live.calorieTarget.toLocaleString("de-DE")} kcal
                </span>
                {macrosTouched
                  ? " — manuelle Werte werden gespeichert."
                  : " — Werte werden automatisch angepasst."}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kalorien (kcal)</Label>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.calorieTarget}
                  onChange={(e) => {
                    setMacrosTouched(true);
                    patch({
                      calorieTarget: e.target.value.replace(/[^\d]/g, "").slice(0, 5),
                    });
                  }}
                  className={inputCls}
                  aria-invalid={Boolean(errors.calorieTarget)}
                />
                {errors.calorieTarget ? (
                  <p className="text-[11px] text-red-400 mt-1">
                    {errors.calorieTarget}
                  </p>
                ) : null}
              </div>
              <div>
                <Label>Protein (g)</Label>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.proteinTargetG}
                  onChange={(e) => {
                    setMacrosTouched(true);
                    patch({
                      proteinTargetG: e.target.value
                        .replace(/[^\d,.]/g, "")
                        .slice(0, 6),
                    });
                  }}
                  className={inputCls}
                  aria-invalid={Boolean(errors.proteinTargetG)}
                />
                {errors.proteinTargetG ? (
                  <p className="text-[11px] text-red-400 mt-1">
                    {errors.proteinTargetG}
                  </p>
                ) : null}
              </div>
              <div>
                <Label>Carbs (g)</Label>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.carbsTargetG}
                  onChange={(e) => {
                    setMacrosTouched(true);
                    patch({
                      carbsTargetG: e.target.value
                        .replace(/[^\d,.]/g, "")
                        .slice(0, 6),
                    });
                  }}
                  className={inputCls}
                  aria-invalid={Boolean(errors.carbsTargetG)}
                />
                {errors.carbsTargetG ? (
                  <p className="text-[11px] text-red-400 mt-1">
                    {errors.carbsTargetG}
                  </p>
                ) : null}
              </div>
              <div>
                <Label>Fett (g)</Label>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.fatTargetG}
                  onChange={(e) => {
                    setMacrosTouched(true);
                    patch({
                      fatTargetG: e.target.value
                        .replace(/[^\d,.]/g, "")
                        .slice(0, 6),
                    });
                  }}
                  className={inputCls}
                  aria-invalid={Boolean(errors.fatTargetG)}
                />
                {errors.fatTargetG ? (
                  <p className="text-[11px] text-red-400 mt-1">{errors.fatTargetG}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Weitere Angaben
            </h3>
            <div>
              <Label>Benutzername</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  @
                </span>
                <Input
                  value={draft.username}
                  onChange={(e) =>
                    patch({
                      username: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                        .slice(0, 24),
                    })
                  }
                  className={cn(inputCls, "pl-7")}
                  placeholder="dein_name"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                value={draft.email}
                readOnly
                className={cn(inputCls, "opacity-70")}
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Login-E-Mail — Änderung nur über Support
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Zielgewicht (kg)</Label>
                <input
                  inputMode="decimal"
                  value={draft.targetWeightKg}
                  onChange={(e) =>
                    patch({
                      targetWeightKg: e.target.value
                        .replace(/[^\d,.]/g, "")
                        .slice(0, 6),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Wasser (ml)</Label>
                <input
                  inputMode="numeric"
                  value={draft.waterTargetMl}
                  onChange={(e) =>
                    patch({
                      waterTargetMl: e.target.value.replace(/[^\d]/g, "").slice(0, 5),
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <Label>Trainingsziel</Label>
              <select
                className={selectCls}
                value={draft.trainingGoal}
                onChange={(e) =>
                  patch({ trainingGoal: e.target.value as TrainingGoal })
                }
              >
                {ONBOARDING_MAIN_GOAL_UI.map((o) => (
                  <option key={o.key} value={o.trainingGoal}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Erfahrung</Label>
                <select
                  className={selectCls}
                  value={draft.experienceLevel}
                  onChange={(e) =>
                    patch({ experienceLevel: e.target.value as PlanLevel })
                  }
                >
                  {ONBOARDING_EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tage / Woche</Label>
                <select
                  className={selectCls}
                  value={draft.workoutDaysPerWeek}
                  onChange={(e) => patch({ workoutDaysPerWeek: e.target.value })}
                >
                  {ONBOARDING_TRAINING_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d} Tage
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Trainingsort</Label>
              <select
                className={selectCls}
                value={draft.trainingLocation}
                onChange={(e) => patch({ trainingLocation: e.target.value })}
              >
                <option value="GYM">Gym</option>
                <option value="HOME">Zuhause</option>
                <option value="BOTH">Gym &amp; Zuhause</option>
              </select>
            </div>
            <div>
              <Label>Land (Lebensmittel)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(
                  [
                    { code: "AT", label: "Österreich" },
                    { code: "DE", label: "Deutschland" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => patch({ countryCode: opt.code })}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-semibold",
                      draft.countryCode === opt.code
                        ? "border-accent/50 bg-accent text-white"
                        : "border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:shadow-none"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Button
            type="button"
            className="w-full min-h-12 rounded-2xl text-base"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Speichern…" : "Speichern"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full min-h-11 rounded-2xl"
            disabled={saving}
            onClick={close}
          >
            Abbrechen
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});
