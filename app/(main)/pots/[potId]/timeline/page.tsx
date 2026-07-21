"use client";

import React from "react";
import PotTimelineExplorer from "../../components/PotTimelineExplorer";
import { usePotContext } from "../PotContext";

export default function PotTimelinePage() {
  const { pot } = usePotContext();
  // Full-height workspace: the explorer owns its header zone and scroll
  // container so the density strip and toolbar stay pinned while the list
  // scrolls. min-h keeps it usable on very short viewports.
  return (
    <div className="flex h-full min-h-[420px] overflow-hidden">
      <PotTimelineExplorer potId={pot.id} />
    </div>
  );
}
