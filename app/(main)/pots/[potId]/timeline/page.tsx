"use client";

import React from "react";
import PotTimelinePanel from "../../components/timeline/PotTimelinePanel";
import { usePotContext } from "../PotContext";

export default function PotTimelinePage() {
  const { pot } = usePotContext();
  return <PotTimelinePanel potId={pot.id} />;
}
