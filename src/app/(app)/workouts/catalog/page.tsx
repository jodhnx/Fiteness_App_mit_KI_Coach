"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PlanConfigurator } from "@/components/workouts/plan-configurator";
import { CatalogBrowseGrid, type QuickPlanFilter } from "@/components/workouts/catalog-browse-grid";

export default function PlanCatalogPage() {
  const [quickFilter, setQuickFilter] = useState<QuickPlanFilter>("ALL");

  return (
    <div className="space-y-6 pb-8 max-w-lg mx-auto">
      <Link
        href="/workouts"
        prefetch
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent active:opacity-80 -ml-1 py-1"
      >
        <ChevronLeft className="h-5 w-5" />
        Training
      </Link>

      <div>
        <h1 className="text-xl font-bold text-white">Vorgefertigte Pläne</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Wähle einen Plan oder konfiguriere deinen eigenen.
        </p>
      </div>

      <PlanConfigurator embedded />
      <div className="border-t border-zinc-800 pt-6">
        <CatalogBrowseGrid quickFilter={quickFilter} onQuickFilter={setQuickFilter} />
      </div>
    </div>
  );
}
