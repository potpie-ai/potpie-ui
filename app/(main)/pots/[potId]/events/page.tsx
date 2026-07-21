"use client";

import React from "react";
import PotEventsPanel from "../../components/PotEventsPanel";
import { PotPage } from "../../components/kit";
import { usePotContext } from "../PotContext";

export default function PotEventsPage() {
  const { pot } = usePotContext();
  return (
    <PotPage width="wide">
      <PotEventsPanel potId={pot.id} />
    </PotPage>
  );
}
