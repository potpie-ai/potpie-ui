"use client";

import React from "react";
import PotGraphExplorer from "../../components/PotGraphExplorer";
import { usePotContext } from "../PotContext";

export default function PotGraphPage() {
  const { pot } = usePotContext();
  // Full-bleed workspace: fill the entire area below the tab rail and let the
  // explorer manage its own overlays. min-h keeps the canvas usable (the
  // layout's scroll container takes over) on very short viewports.
  return (
    <div className="flex h-full min-h-[420px] overflow-hidden">
      <PotGraphExplorer potId={pot.id} />
    </div>
  );
}
