"use client";

import { useState } from "react";
import { PlanConfigurator } from "@/components/workouts/plan-configurator";
import { CatalogBrowseGrid, type QuickPlanFilter } from "@/components/workouts/catalog-browse-grid";

export default function PlanCatalogPage() {
  const [quickFilter, setQuickFilter] = useState<QuickPlanFilter>("ALL");

  return (
    <div className="space-y-8 pb-8 max-w-lg mx-auto">
      <PlanConfigurator embedded />
      <div className="border-t border-zinc-800 pt-8">
        <CatalogBrowseGrid quickFilter={quickFilter} onQuickFilter={setQuickFilter} />
      </div>
    </div>
  );
}
