"use client";

import React from "react";
import PotSourcesPanel from "../../components/PotSourcesPanel";
import { usePotContext } from "../PotContext";

export default function PotSourcesPage() {
  const { pot, isOwner, refetchPots } = usePotContext();
  return (
    <PotSourcesPanel
      potId={pot.id}
      isOwner={isOwner}
      onPrimaryRepoChanged={refetchPots}
    />
  );
}
