"use client";

import { memo, useState } from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ruler } from "lucide-react";
import { hapticTap } from "@/lib/haptic";

type Props = {
  onSaved?: () => void;
  latest?: {
    waistCm?: number | null;
    chestCm?: number | null;
    hipsCm?: number | null;
    bicepsCm?: number | null;
    thighsCm?: number | null;
    bodyFatPct?: number | null;
  } | null;
};

export const BodyMeasurementsCard = memo(function BodyMeasurementsCard({
  onSaved,
  latest,
}: Props) {
  const [form, setForm] = useState({
    waistCm: latest?.waistCm?.toString() ?? "",
    chestCm: latest?.chestCm?.toString() ?? "",
    hipsCm: latest?.hipsCm?.toString() ?? "",
    bicepsCm: latest?.bicepsCm?.toString() ?? "",
    thighsCm: latest?.thighsCm?.toString() ?? "",
    bodyFatPct: latest?.bodyFatPct?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    hapticTap();
    try {
      const payload: Record<string, number> = {};
      for (const [k, v] of Object.entries(form)) {
        const n = Number(v.replace(",", "."));
        if (Number.isFinite(n) && n > 0) payload[k] = n;
      }
      if (Object.keys(payload).length === 0) {
        toast.error("Mindestens einen Wert eingeben");
        return;
      }
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen");
        return;
      }
      toast.success("Körpermaße gespeichert");
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "waistCm", label: "Taille (cm)" },
    { key: "chestCm", label: "Brust (cm)" },
    { key: "hipsCm", label: "Hüfte (cm)" },
    { key: "bicepsCm", label: "Bizeps (cm)" },
    { key: "thighsCm", label: "Oberschenkel (cm)" },
    { key: "bodyFatPct", label: "Körperfett (%)" },
  ];

  return (
    <PremiumCard className="space-y-3" id="measurements">
      <div className="flex items-center gap-2">
        <Ruler className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-white">Körperumfänge</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label className="text-[10px] text-zinc-500 uppercase">{label}</label>
            <Input
              inputMode="decimal"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="h-10 mt-0.5"
              placeholder="—"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="premium"
        className="w-full"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Speichern…" : "Maße speichern"}
      </Button>
    </PremiumCard>
  );
});
