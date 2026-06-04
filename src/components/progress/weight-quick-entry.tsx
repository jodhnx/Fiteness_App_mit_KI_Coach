"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  initialKg?: number | null;
  onSave: (weightKg: number, waistCm?: number) => Promise<void>;
  compact?: boolean;
};

function parseKg(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 500 ? Math.round(n * 10) / 10 : null;
}

export function WeightQuickEntry({ initialKg, onSave, compact }: Props) {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialKg != null) setWeight(String(initialKg));
  }, [initialKg]);

  const adjust = useCallback((delta: number) => {
    const base = parseKg(weight) ?? initialKg ?? 70;
    setWeight(String(Math.round((base + delta) * 10) / 10));
  }, [weight, initialKg]);

  async function save() {
    const kg = parseKg(weight);
    if (kg == null) return;
    setSaving(true);
    try {
      await onSave(kg, waist ? Number(waist) : undefined);
      setWaist("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div>
        <Label className="text-zinc-400">Gewicht (kg)</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {([-0.5, -0.1, 0.1, 0.5] as const).map((d) => (
            <Button
              key={d}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs tabular-nums"
              onClick={() => adjust(d)}
            >
              {d > 0 ? "+" : ""}
              {d} kg
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => adjust(-0.1)}
            aria-label="-0,1 kg"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            type="number"
            step="0.1"
            inputMode="decimal"
            className="text-center text-lg font-semibold tabular-nums"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => adjust(0.1)}
            aria-label="+0,1 kg"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!compact && (
        <div>
          <Label className="text-zinc-400">Taillenumfang (cm, optional)</Label>
          <Input
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            type="number"
            className="mt-1"
          />
        </div>
      )}
      <Button className="w-full btn-accent" onClick={save} disabled={saving || parseKg(weight) == null}>
        {saving ? "Speichern…" : "Gewicht speichern"}
      </Button>
    </div>
  );
}
