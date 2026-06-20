"use client";

import { useState } from "react";
import { PlanConfigurator } from "@/components/workouts/plan-configurator";
import { CatalogBrowseGrid, type GoalFilter } from "@/components/workouts/catalog-browse-grid";

export default function PlanCatalogPage() {
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("ALL");

  return (
    <div className="space-y-8 pb-8">
      <CatalogBrowseGrid goalFilter={goalFilter} onGoalFilter={setGoalFilter} />
      <div className="border-t border-zinc-800 pt-8">
        <PlanConfigurator />
      </div>
    </div>
  );
}
