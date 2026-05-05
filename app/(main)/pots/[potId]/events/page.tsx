"use client";

import React from "react";
import PotEventsPanel from "../../components/PotEventsPanel";
import { usePotContext } from "../PotContext";

export default function PotEventsPage() {
  const { pot } = usePotContext();
  return <PotEventsPanel potId={pot.id} />;
}
