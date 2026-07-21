"use client";

import React from "react";
import PotSourcesPanel from "../../components/PotSourcesPanel";
import { PotPage } from "../../components/kit";
import { usePotContext } from "../PotContext";

export default function PotSourcesPage() {
  const { pot, isOwner, refetchPots } = usePotContext();
  return (
    <PotPage width="content">
      <PotSourcesPanel
        potId={pot.id}
        isOwner={isOwner}
        primaryRepoName={pot.primary_repo_name}
        onPrimaryRepoChanged={refetchPots}
      />
    </PotPage>
  );
}
