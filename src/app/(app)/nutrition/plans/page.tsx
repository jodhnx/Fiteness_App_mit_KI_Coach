"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Check, Copy, Plus, Trash2, CalendarDays } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PlanListItemDto } from "@/lib/nutrition-plan-types";
import {
  readPlansListCache,
  writePlansListCache,
  invalidateNutritionPlanCaches,
} from "@/lib/nutrition-plan-cache";
import { PLAN_STATUS_LABEL } from "@/lib/nutrition-plan-constants";

const STATUS_LABEL = PLAN_STATUS_LABEL;

export default function NutritionPlansPage() {
  const router = useRouter();
  const initial = useRef(readPlansListCache()).current;
  const [plans, setPlans] = useState<PlanListItemDto[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial?.length);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    try {
      const res = await fetch("/api/nutrition/plans", { credentials: "include" });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as { plans: PlanListItemDto[] };
      setPlans(data.plans);
      writePlansListCache(data.plans);
    } catch {
      if (!plans.length) toast.error("Pläne konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [plans.length]);

  useEffect(() => {
    void load(Boolean(initial?.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  async function mutate(
    id: string,
    body: Record<string, unknown>,
    method: "PATCH" | "DELETE" = "PATCH"
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/nutrition/plans/${id}`, {
        method,
        credentials: "include",
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PATCH" ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Aktion fehlgeschlagen");
        return;
      }
      if (method === "DELETE") {
        invalidateNutritionPlanCaches(id);
        setPlans((prev) => prev.filter((p) => p.id !== id));
        toast.success("Plan gelöscht");
      } else {
        const data = (await res.json()) as { plan: { id: string } };
        invalidateNutritionPlanCaches(id);
        if (body.action === "duplicate") {
          toast.success("Plan dupliziert");
          router.push(`/nutrition/plans/${data.plan.id}`);
          return;
        }
        await load(true);
        toast.success("Gespeichert");
      }
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageShell
      title="Meine Ernährungspläne"
      subtitle="Plane deine Ernährung für die nächsten Tage"
      maxWidth="2xl"
      className="space-y-4 pb-28"
    >
      <Link
        href="/nutrition"
        className="inline-flex items-center text-sm font-medium text-accent -mt-1"
      >
        ← Ernährung
      </Link>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {plans.length > 0
            ? `${plans.length} ${plans.length === 1 ? "Plan" : "Pläne"}`
            : "Noch keine Pläne"}
        </p>
        <Button asChild className="min-h-11 rounded-xl btn-accent">
          <Link href="/nutrition/plans/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Ernährungsplan erstellen
          </Link>
        </Button>
      </div>

      {loading && plans.length === 0 ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-zinc-200/70 animate-pulse dark:bg-white/[0.04]"
            />
          ))}
        </div>
      ) : null}

      {!loading && plans.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-8 text-center space-y-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
          <CalendarDays className="h-10 w-10 mx-auto text-accent" />
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              Plane deine Ernährung für die nächsten Tage.
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Erstelle einen Plan mit Mahlzeiten und Lebensmitteln — ohne sie
              automatisch als gegessen zu loggen.
            </p>
          </div>
          <Button asChild className="min-h-11 rounded-xl btn-accent">
            <Link href="/nutrition/plans/new">Ersten Ernährungsplan erstellen</Link>
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              "rounded-2xl border bg-white p-4 shadow-sm dark:bg-white/[0.02] dark:shadow-none",
              plan.isActive
                ? "border-accent/40 ring-1 ring-accent/20"
                : "border-zinc-200/90 dark:border-white/[0.08]"
            )}
          >
            <Link href={`/nutrition/plans/${plan.id}`} className="block space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white truncate">
                    {plan.name}
                  </h2>
                  <p className="text-[12px] text-zinc-500 mt-0.5">
                    {plan.durationDays} Tage · {STATUS_LABEL[plan.status] ?? plan.status}
                    {plan.isActive ? " · Aktiv" : ""}
                  </p>
                </div>
                <span className="text-[11px] tabular-nums text-zinc-500 shrink-0">
                  {plan.progressDays}/{plan.durationDays} geplant
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="kcal" value={plan.targetCalories || "—"} />
                <Stat label="P" value={plan.targetProteinG ? `${plan.targetProteinG}g` : "—"} />
                <Stat label="C" value={plan.targetCarbsG ? `${plan.targetCarbsG}g` : "—"} />
                <Stat label="F" value={plan.targetFatG ? `${plan.targetFatG}g` : "—"} />
              </div>
              <p className="text-[11px] text-zinc-500">
                {plan.mealCount} Mahlzeiten · {plan.itemCount} Foods
              </p>
            </Link>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {!plan.isActive ? (
                <ActionBtn
                  disabled={busyId === plan.id}
                  onClick={() => void mutate(plan.id, { action: "activate" })}
                  icon={Check}
                  label="Aktivieren"
                />
              ) : null}
              <ActionBtn
                disabled={busyId === plan.id}
                onClick={() => void mutate(plan.id, { action: "duplicate" })}
                icon={Copy}
                label="Duplizieren"
              />
              <ActionBtn
                disabled={busyId === plan.id}
                onClick={() => void mutate(plan.id, { action: "archive" })}
                icon={Archive}
                label="Archivieren"
              />
              <ActionBtn
                disabled={busyId === plan.id}
                onClick={() => {
                  if (confirm("Plan wirklich löschen?")) {
                    void mutate(plan.id, {}, "DELETE");
                  }
                }}
                icon={Trash2}
                label="Löschen"
                danger
              />
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-1.5 py-2 dark:bg-white/[0.04]">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  disabled,
  danger,
}: {
  onClick: () => void;
  icon: typeof Check;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold",
        danger
          ? "border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-400"
          : "border-zinc-200 text-zinc-700 dark:border-white/[0.08] dark:text-zinc-300"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
